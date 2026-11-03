import * as THREE from 'three';
import { CombatantStats, computeDamage, type StatBlock } from '../combat/Stats.js';
import type { MonsterDef } from '../data/monsters.js';
import type { MonsterAttack } from '../data/skills.js';
import type { ProjectileSystem } from '../combat/Projectile.js';
import type { TelegraphRing } from '../combat/Telegraph.js';

export type EnemyState = 'idle' | 'alert' | 'chase' | 'attack' | 'return' | 'dead';

export interface EnemyHitContext {
  /** 对玩家结算一次攻击(已含闪避/暴击) */
  damagePlayer: (amount: number, from: THREE.Vector3, poison?: { dps: number; dur: number }) => void;
  /** 玩家当前位置(每帧更新) */
  playerPos: THREE.Vector3;
  /** 玩家属性(敌弹结算用) */
  playerDef: { def: number; dodge: number; element: 'wood' | 'fire' | 'earth' | 'metal' | 'water' };
  spawnProjectile: (opts: { from: THREE.Vector3; dir: THREE.Vector3; attack: MonsterAttack; damage: number }) => void;
}

/** 简易身体(鬼/猿/Boss 三型;异兽拼装外观 M6/M7 替换) */
function buildBody(def: MonsterDef): { group: THREE.Group; core: THREE.Mesh } {
  const g = new THREE.Group();
  if (def.body === 'ghost' || def.body === 'boss_ghost') {
    const color = def.body === 'boss_ghost' ? '#4a3560' : '#3a3350';
    const robe = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.5, 7),
      new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.95, transparent: true, opacity: 0.92 }),
    );
    robe.position.y = 0.75;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 7),
      new THREE.MeshStandardMaterial({ color: '#241d33', flatShading: true }),
    );
    head.position.y = 1.68;
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#ff4a3a', emissive: '#ff2a1a', emissiveIntensity: 2.4 });
    const eL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), eyeMat);
    eL.position.set(-0.1, 1.72, 0.23);
    const eR = eL.clone();
    eR.position.x = 0.1;
    const wisp = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.12),
      new THREE.MeshStandardMaterial({ color: '#9a7ac8', emissive: '#7a5fa8', emissiveIntensity: 1.8 }),
    );
    wisp.position.y = 2.1;
    g.add(robe, head, eL, eR, wisp);
    return { group: g, core: robe };
  }
  // ape(山魈)
  const fur = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.62, 1),
    new THREE.MeshStandardMaterial({ color: '#4a3b2a', flatShading: true, roughness: 1 }),
  );
  fur.position.y = 0.72;
  fur.scale.y = 1.15;
  const head2 = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.3, 1),
    new THREE.MeshStandardMaterial({ color: '#5a4632', flatShading: true }),
  );
  head2.position.set(0, 1.35, 0.18);
  const armMat = new THREE.MeshStandardMaterial({ color: '#3a2d20', flatShading: true });
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.9, 5), armMat);
  armL.position.set(-0.62, 0.7, 0);
  armL.rotation.z = 0.5;
  const armR = armL.clone();
  armR.position.x = 0.62;
  armR.rotation.z = -0.5;
  const eyeMat2 = new THREE.MeshStandardMaterial({ color: '#ffb45e', emissive: '#ff8a2a', emissiveIntensity: 2 });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), eyeMat2);
  eye.position.set(-0.09, 1.42, 0.42);
  const eye2 = eye.clone();
  eye2.position.x = 0.09;
  g.add(fur, head2, armL, armR, eye, eye2);
  return { group: g, core: fur };
}

/**
 * 敌人:AI 状态机 巡逻→警戒→追击→攻击→返回(PROMPT §3.5);
 * Boss 多阶段(血量阈值切换技能池)+ 预警圈 + 弹幕。
 */
export class Enemy {
  readonly group: THREE.Group;
  readonly stats: CombatantStats;
  readonly position = new THREE.Vector3();
  readonly def: MonsterDef;

  state: EnemyState = 'idle';
  heading = 0;
  private home: THREE.Vector3;
  private patrolTarget: THREE.Vector3;
  private patrolWait = 0;
  private attackT = -1;      // <0 空闲
  private attack: MonsterAttack | null = null;
  private hitDone = false;
  private cd = 0;
  private phase = 0;
  private animT = 0;
  private deadT = 0;
  onDeath: ((e: Enemy) => void) | null = null;
  onPhase: ((e: Enemy) => void) | null = null;

  constructor(
    def: MonsterDef,
    pos: THREE.Vector3,
    private readonly deps: {
      scene: THREE.Scene;
      projectiles: ProjectileSystem;
      telegraph: TelegraphRing;
      heightAt: (x: number, z: number) => number;
      colliders: { x: number; z: number; r: number }[];
    },
  ) {
    this.def = def;
    const block: StatBlock = {
      maxHp: def.hp, maxMp: 0, atk: def.atk, def: def.def,
      crit: 0.04, critDmg: 1.3, dodge: 0.02, element: def.element,
    };
    this.stats = new CombatantStats(block);
    const body = buildBody(def);
    this.group = body.group;
    if (def.scale) this.group.scale.setScalar(def.scale);
    this.position.copy(pos);
    this.home = pos.clone();
    this.patrolTarget = pos.clone();
    this.group.position.copy(pos);
    deps.scene.add(this.group);
  }

  get isBoss(): boolean {
    return this.def.isBoss === true;
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }

  /** 受击 */
  takeDamage(amount: number, crit: boolean, elementMul: number): boolean {
    if (!this.alive) return false;
    this.stats.hp -= amount;
    if (this.isBoss && this.def.phaseThresholds) {
      const ratio = this.stats.hp / this.stats.block.maxHp;
      while (this.phase < this.def.phaseThresholds.length && ratio <= this.def.phaseThresholds[this.phase]!) {
        this.phase++;
        this.onPhase?.(this);
      }
    }
    if (this.stats.hp <= 0) {
      this.die();
      return true;
    }
    // 受击进入警戒
    if (this.state === 'idle' || this.state === 'return') this.state = 'alert';
    void crit;
    void elementMul;
    return false;
  }

  private die(): void {
    this.state = 'dead';
    this.deadT = 0;
    this.onDeath?.(this);
  }

  /** 每帧 */
  update(dt: number, elapsed: number, ctx: EnemyHitContext): void {
    if (this.state === 'dead') {
      this.deadT += dt;
      const s = Math.max(0, 1 - this.deadT * 1.6);
      this.group.scale.setScalar((this.def.scale ?? 1) * s);
      this.group.position.y = this.position.y - (1 - s) * 0.4;
      if (this.deadT > 0.8) this.group.visible = false;
      return;
    }
    this.animT = elapsed;
    // 中毒 dot
    if (this.stats.poisonUntil > elapsed) {
      this.stats.hp -= this.stats.poisonDps * dt;
      if (this.stats.hp <= 0) {
        this.die();
        return;
      }
    }
    const pPos = ctx.playerPos;
    const dist = Math.hypot(pPos.x - this.position.x, pPos.z - this.position.z);
    this.cd -= dt;

    switch (this.state) {
      case 'idle': {
        // 巡逻:在家附近随机踱步
        if (this.patrolWait > 0) this.patrolWait -= dt;
        else {
          const dx = this.patrolTarget.x - this.position.x;
          const dz = this.patrolTarget.z - this.position.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.3) {
            this.patrolWait = 1.2 + Math.random() * 1.6;
            const a = Math.random() * Math.PI * 2;
            const r = 2.5 + Math.random() * 3;
            this.patrolTarget.set(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r);
          } else {
            this.moveToward(this.patrolTarget, this.def.speed * 0.45, dt);
          }
        }
        if (dist < this.def.aggroDist) this.state = 'alert';
        break;
      }
      case 'alert': {
        this.faceToward(pPos, dt);
        if (this.cd <= 0) this.state = 'chase';
        break;
      }
      case 'chase': {
        if (dist > this.def.aggroDist * 2.2) {
          this.state = 'return';
          break;
        }
        if (dist <= this.def.attackDist) {
          this.state = 'attack';
          this.startAttack(ctx);
        } else {
          this.moveToward(pPos, this.def.speed, dt);
        }
        break;
      }
      case 'attack': {
        this.faceToward(pPos, dt);
        if (this.attack) {
          this.attackT += dt;
          if (!this.hitDone && this.attackT >= this.attack.hitAt) {
            this.hitDone = true;
            this.executeHit(ctx);
          }
          if (this.attackT >= this.attack.hitAt + 0.35) {
            this.attack = null;
            this.attackT = -1;
            this.cd = this.def.attackCd * (this.isBoss && this.phase > 0 ? 0.72 : 1);
            this.state = dist <= this.def.attackDist * 1.3 ? 'chase' : 'chase';
          }
        }
        break;
      }
      case 'return': {
        const dh = Math.hypot(this.home.x - this.position.x, this.home.z - this.position.z);
        if (dh < 0.4) {
          this.state = 'idle';
        } else {
          this.moveToward(this.home, this.def.speed * 0.8, dt);
        }
        break;
      }
    }

    // 贴地 + 呼吸浮动
    this.position.y = this.deps.heightAt(this.position.x, this.position.z);
    const hover = this.def.body === 'ghost' || this.def.body === 'boss_ghost' ? Math.sin(elapsed * 2.1) * 0.09 : 0;
    this.group.position.set(this.position.x, this.position.y + hover, this.position.z);
    this.group.rotation.y = this.heading;
  }

  private startAttack(ctx: EnemyHitContext): void {
    const pool = this.def.attacks[Math.min(this.phase, this.def.attacks.length - 1)]!;
    const atk = pool[Math.floor(Math.random() * pool.length)]!;
    this.attack = atk;
    this.attackT = 0;
    this.hitDone = false;
    // 预警圈(近战圈/砸地)
    if (atk.shape === 'circle' && atk.telegraph) {
      this.deps.telegraph.play(
        new THREE.Vector3(ctx.playerPos.x, this.deps.heightAt(ctx.playerPos.x, ctx.playerPos.z), ctx.playerPos.z),
        atk.range ?? 2.4,
        atk.telegraph,
      );
    }
  }

  private executeHit(ctx: EnemyHitContext): void {
    const atk = this.attack!;
    const pPos = ctx.playerPos;
    const dx = pPos.x - this.position.x;
    const dz = pPos.z - this.position.z;
    const dist = Math.hypot(dx, dz);

    if (atk.shape === 'projectile') {
      const burst = atk.burst ?? 1;
      const from = _f.set(this.position.x, this.position.y + 1.5 * (this.def.scale ?? 1), this.position.z);
      for (let i = 0; i < burst; i++) {
        const jitter = burst > 1 ? (i - (burst - 1) / 2) * 0.2 : 0;
        const result = computeDamage(
          { atk: this.stats.block.atk, crit: this.stats.block.crit, critDmg: this.stats.block.critDmg, element: this.def.element },
          ctx.playerDef,
          atk.multiplier,
        );
        if (result.dodged) continue;
        const dir = _t.copy(pPos).add(_j.set(jitter, 0.4, 0)).sub(from).normalize();
        ctx.spawnProjectile({ from, dir, attack: atk, damage: result.amount });
      }
      return;
    }
    if (dist > (atk.range ?? 2.2) + 0.3) return;
    if (atk.shape === 'cone') {
      const fwd = Math.atan2(Math.sin(this.heading), Math.cos(this.heading));
      const ang = Math.atan2(dx, dz);
      let diff = Math.abs(ang - fwd);
      while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
      const half = ((atk.arcDeg ?? 90) * Math.PI) / 180 / 2;
      if (diff > half + 0.25) return;
    }
    const result = computeDamage(
      { atk: this.stats.block.atk, crit: this.stats.block.crit, critDmg: this.stats.block.critDmg, element: this.def.element },
      { def: 5, dodge: 0.03, element: 'wood' },
      atk.multiplier,
    );
    if (!result.dodged) {
      ctx.damagePlayer(result.amount, this.position, atk.poison);
    }
  }

  private moveToward(target: THREE.Vector3, speed: number, dt: number): void {
    const dx = target.x - this.position.x;
    const dz = target.z - this.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 1e-4) return;
    const step = Math.min(d, speed * dt);
    this.position.x += (dx / d) * step;
    this.position.z += (dz / d) * step;
    // 目标朝向
    this.heading = Math.atan2(dx, dz);
  }

  private faceToward(p: THREE.Vector3, dt: number): void {
    const target = Math.atan2(p.x - this.position.x, p.z - this.position.z);
    let diff = target - this.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.heading += diff * Math.min(1, dt * 8);
  }
}

const _t = new THREE.Vector3();
const _j = new THREE.Vector3();
const _f = new THREE.Vector3();
