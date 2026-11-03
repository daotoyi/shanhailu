import * as THREE from 'three';
import type { SkillDef } from '../data/skills.js';
import { SKILLS, PLAYER_SKILL_SLOTS, PLAYER_ULT } from '../data/skills.js';
import type { CombatantStats } from './Stats.js';
import type { Enemy } from '../actor/Enemy.js';
import type { HitFX } from './HitFX.js';
import type { ProjectileSystem } from './Projectile.js';
import { computeDamage } from './Stats.js';

export type PlayerCombatState = 'free' | 'windup' | 'recover' | 'dodge';

export interface ExecutorDeps {
  stats: CombatantStats;
  playerPos: THREE.Vector3;
  playerRig: { playOverride: (s: 'attack' | 'cast', d: number) => void };
  enemies: () => Enemy[];
  hitfx: HitFX;
  projectiles: ProjectileSystem;
  /** 玩家普攻/技能命中怪物时结算 */
  onDamageEnemy: (e: Enemy, amount: number, crit: boolean, em: number) => void;
  onPlayerHeal: (amount: number) => void;
  /** 翻滚位移请求(由 Player 消化,含方向) */
  dodge: (dir: THREE.Vector3) => void;
  heightAt: (x: number, z: number) => number;
}

/**
 * 玩家技能执行器:普攻三连/三技能/大招(充能)/翻滚(无敌帧)。
 * 时序:windup(锁移动)→ hitAt 判定 → recover;命中给 hitstop+震屏。
 */
export class SkillExecutor {
  private state: PlayerCombatState = 'free';
  private t = 0;
  private current: SkillDef | null = null;
  private hitIndex = 0;
  private cds: Record<string, number> = {};
  private comboIndex = 0;
  private comboWindow = 0;
  /** 翻滚无敌帧 */
  invincible = false;
  private invincibleLeft = 0;
  /** 大招黑场特写(简化:白闪层由 HUD 实现) */
  onUltCast: (() => void) | null = null;

  constructor(private readonly deps: ExecutorDeps) {}

  get busy(): boolean {
    return this.state !== 'free';
  }

  get activeState(): PlayerCombatState {
    return this.state;
  }

  getCd(slotId: string): number {
    return this.cds[slotId] ?? 0;
  }

  private setCd(id: string, v: number): void {
    this.cds[id] = v;
  }

  private nowSec = 0;

  /** 每帧;elapsed 为引擎时钟(与 Enemy poison 判定同基准) */
  update(dt: number, elapsed: number, playerHeading: number): void {
    this.nowSec = elapsed;
    for (const k of Object.keys(this.cds)) {
      if (this.cds[k]! > 0) this.cds[k] = Math.max(0, this.cds[k]! - dt);
    }
    if (this.invincibleLeft > 0) {
      this.invincibleLeft -= dt;
      if (this.invincibleLeft <= 0) this.invincible = false;
    }
    if (this.comboWindow > 0) {
      this.comboWindow -= dt;
      if (this.comboWindow <= 0) this.comboIndex = 0;
    }

    switch (this.state) {
      case 'free':
        return;
      case 'dodge':
        this.t -= dt;
        if (this.t <= 0) this.state = 'free';
        return;
      default: {
        const skill = this.current!;
        this.t += dt;
        while (this.hitIndex < skill.hitAt.length && this.t >= skill.hitAt[this.hitIndex]!) {
          this.hitIndex++;
          this.executeHit(skill, playerHeading);
        }
        if (this.t >= skill.windup + skill.recover) {
          this.state = 'free';
          this.current = null;
        }
        return;
      }
    }
  }

  /** 普攻(三连) */
  basicAttack(): void {
    if (this.busy) return;
    const ids = ['basic_1', 'basic_2', 'basic_3'];
    const id = ids[this.comboIndex % 3]!;
    this.comboIndex++;
    this.comboWindow = 0.9;
    this.cast(SKILLS[id]!);
  }

  /** 槽位技能(0/1/2) */
  castSlot(i: number): void {
    if (this.busy) return;
    const id = PLAYER_SKILL_SLOTS[i];
    if (!id) return;
    const def = SKILLS[id]!;
    if (this.getCd(id) > 0) return;
    if (!this.deps.stats.spendMp(def.mpCost)) return;
    this.setCd(id, def.cd);
    this.cast(def);
  }

  /** 大招(充能满) */
  castUlt(): void {
    if (this.busy) return;
    const def = SKILLS[PLAYER_ULT]!;
    if (this.deps.stats.ultCharge < 100) return;
    this.deps.stats.ultCharge = 0;
    this.onUltCast?.();
    this.cast(def);
  }

  /** 翻滚(无敌帧 PROMPT §3.5) */
  roll(dir: THREE.Vector3): void {
    if (this.busy) return;
    this.state = 'dodge';
    this.t = 0.38;
    this.invincible = true;
    this.invincibleLeft = 0.34;
    this.deps.dodge(dir);
  }

  private cast(def: SkillDef): void {
    this.current = def;
    this.state = 'windup';
    this.t = 0;
    this.hitIndex = 0;
    this.deps.playerRig.playOverride(def.isUlt || def.shape === 'circle' ? 'cast' : 'attack', def.windup + def.recover + 0.1);
  }

  /** 形状命中判定 */
  private executeHit(skill: SkillDef, heading: number): void {
    const pos = this.deps.playerPos;

    if (skill.shape === 'projectile') {
      const dir = _d.set(Math.sin(heading), 0, Math.cos(heading));
      this.deps.projectiles.spawn({
        pos: _p.copy(pos).add(_o.set(dir.x * 0.6, 1.2, dir.z * 0.6)),
        dir,
        speed: skill.speed ?? 10,
        life: skill.life ?? 1.2,
        color: skill.color ?? '#8fe0c8',
        poison: skill.poison,
        onHit: (hitPos) => {
          for (const e of this.deps.enemies()) {
            if (!e.alive) continue;
            const dx = e.position.x - hitPos.x;
            const dz = e.position.z - hitPos.z;
            if (dx * dx + dz * dz < 0.85) {
              this.applyDamage(e, skill);
              return true;
            }
          }
          return false;
        },
        onExpire: () => {},
      });
      return;
    }

    for (const e of this.deps.enemies()) {
      if (!e.alive) continue;
      const dx = e.position.x - pos.x;
      const dz = e.position.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > (skill.range ?? 2.2) + 0.45) continue;
      if (skill.shape === 'cone') {
        const ang = Math.atan2(dx, dz);
        let diff = Math.abs(ang - heading);
        while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
        if (diff > ((skill.arcDeg ?? 100) * Math.PI) / 180 / 2 + 0.18) continue;
      }
      this.applyDamage(e, skill);
    }

    if (skill.heal) {
      const healed = this.deps.stats.heal(skill.heal);
      this.deps.onPlayerHeal(healed);
    }
  }

  private applyDamage(e: Enemy, skill: SkillDef): void {
    const result = computeDamage(this.deps.stats.block, e.stats.block, skill.multiplier);
    if (result.dodged) return;
    this.deps.onDamageEnemy(e, result.amount, result.crit, result.elementMul);
    // 打击反馈三件套:飘字 + hitstop + 微震(PROMPT §3.5)
    this.deps.hitfx.floatDamage(
      _p.set(e.position.x, e.position.y + 1.2, e.position.z),
      result.amount,
      { crit: result.crit, elementMul: result.elementMul },
    );
    if (result.crit) this.deps.hitfx.hitstop(0.09);
    else this.deps.hitfx.hitstop(0.05);
    this.deps.hitfx.shake(result.crit ? 0.5 : 0.24);
    if (skill.poison) {
      e.stats.poisonDps = skill.poison.dps;
      e.stats.poisonUntil = this.nowSec + skill.poison.dur;
    }
    if (skill.ultGain) this.deps.stats.addUlt(skill.ultGain + (result.crit ? 3 : 0));
  }
}

const _d = new THREE.Vector3();
const _p = new THREE.Vector3();
const _o = new THREE.Vector3();
