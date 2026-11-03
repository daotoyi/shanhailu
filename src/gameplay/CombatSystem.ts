import * as THREE from 'three';
import { BASE_PLAYER_STATS, CombatantStats } from '../combat/Stats.js';
import { SkillExecutor } from '../combat/SkillExecutor.js';
import { HitFX } from '../combat/HitFX.js';
import { ProjectileSystem } from '../combat/Projectile.js';
import { TelegraphRing } from '../combat/Telegraph.js';
import { DropSystem } from '../combat/Drops.js';
import { Enemy } from '../actor/Enemy.js';
import { MONSTERS } from '../data/monsters.js';
import type { MonsterAttack } from '../data/skills.js';
import type { World } from '../world/World.js';
import type { FollowCamera } from '../world/FollowCamera.js';
import type { InputManager } from '../core/Input/InputManager.js';
import type { EventBus } from '../core/events.js';

/**
 * 战斗系统组装(M4):玩家技能/敌方 AI/弹道/预警/掉落/死亡复活。
 * hitstop 经时间缩放作用于战斗子层;击杀经 quest:kill 联动任务。
 */
export class CombatSystem {
  readonly stats = new CombatantStats({ ...BASE_PLAYER_STATS });
  readonly enemies: Enemy[] = [];
  readonly hitfx: HitFX;
  readonly projectiles: ProjectileSystem;
  readonly drops: DropSystem;
  readonly executor: SkillExecutor;
  private readonly telegraph: TelegraphRing;
  playerDead = false;
  private deadT = 0;
  /** 贝币(M5 迁移至背包) */
  coins = 0;
  herbsCollected = 0;
  elapsedRef = 0;
  /** main 注入当前相机 yaw(翻滚方向) */
  lastYaw = 0;
  onPlayerDown: (() => void) | null = null;

  constructor(
    private readonly world: World,
    private readonly input: InputManager,
    private readonly bus: EventBus,
    private readonly follow: FollowCamera,
    camera: THREE.PerspectiveCamera,
    uiStage: { append(...nodes: HTMLElement[]): void },
  ) {
    this.hitfx = new HitFX(uiStage, camera, follow);
    this.projectiles = new ProjectileSystem(world.scene);
    this.telegraph = new TelegraphRing(world.scene);
    this.drops = new DropSystem(world.scene, world.heightAt);
    const self = this;
    this.executor = new SkillExecutor({
      stats: this.stats,
      playerPos: world.player.position,
      playerRig: {
        playOverride: (s, d) => world.player.playOverride(s, d),
      },
      enemies: () => self.enemies,
      hitfx: this.hitfx,
      projectiles: this.projectiles,
      onDamageEnemy: (e, amount, crit, em) => {
        void crit;
        void em;
        e.takeDamage(amount, crit, em);
      },
      onPlayerHeal: () => {},
      dodge: (dir) => world.player.setDodgeImpulse(dir),
      heightAt: world.heightAt,
    });
  }

  spawnMonster(defId: string, x: number, z: number): Enemy {
    const def = MONSTERS[defId]!;
    const e = new Enemy(def, new THREE.Vector3(x, this.world.heightAt(x, z), z), {
      scene: this.world.scene,
      projectiles: this.projectiles,
      telegraph: this.telegraph,
      heightAt: this.world.heightAt,
      colliders: this.world.maps.map.colliders,
    });
    e.onDeath = (en) => {
      const [cmin, cmax] = en.def.coins;
      const total = cmin + Math.floor(Math.random() * (cmax - cmin + 1));
      const drops = Math.min(5, Math.max(1, Math.round(total / 3)));
      for (let i = 0; i < drops; i++) this.drops.spawn(en.position, 'coin', Math.ceil(total / drops));
      if (Math.random() < 0.35) this.drops.spawn(en.position, 'herb', 1);
      this.bus.emit('quest:kill', { monsterId: en.def.id });
      if (en.isBoss) this.follow.addShake(0.8);
    };
    e.onPhase = () => this.follow.addShake(0.6);
    this.enemies.push(e);
    return e;
  }

  clearEnemies(): void {
    for (const e of this.enemies) e.group.parent?.remove(e.group);
    this.enemies.length = 0;
    this.projectiles.clear();
    this.drops.clear();
  }

  private damagePlayer(amount: number, poison?: { dps: number; dur: number }): void {
    if (this.playerDead || this.executor.invincible || this.world.player.isOverriding && false) return;
    if (this.playerDead || this.executor.invincible) return;
    this.stats.hp -= amount;
    this.hitfx.floatDamage(
      _dp.set(this.world.player.position.x, this.world.player.position.y + 1.7, this.world.player.position.z),
      amount,
      {},
    );
    this.follow.addShake(0.32);
    if (poison) {
      this.stats.poisonDps = poison.dps;
      this.stats.poisonUntil = this.elapsedRef + poison.dur;
    }
    if (this.stats.hp <= 0) {
      this.stats.hp = 0;
      this.playerDead = true;
      this.deadT = 0;
      this.onPlayerDown?.();
    }
  }

  /** 每帧;frozen(对话/过场)时跳过输入与伤害 */
  update(dt: number, elapsed: number, frozen: boolean): void {
    this.elapsedRef = elapsed;
    const sdt = dt * this.hitfx.getTimeScale(); // hitstop:战斗子层时间缩放
    const player = this.world.player;
    const playerPos = player.position;

    if (this.playerDead) {
      this.deadT += dt;
      player.rig.animate('dead', elapsed, dt, 0);
      if (this.deadT > 2.2) this.respawn();
      return;
    }

    if (!frozen) {
      if (this.input.consumePressed('attack')) this.executor.basicAttack();
      if (this.input.consumePressed('skill1')) this.executor.castSlot(0);
      if (this.input.consumePressed('skill2')) this.executor.castSlot(1);
      if (this.input.consumePressed('skill3')) this.executor.castSlot(2);
      if (this.input.consumePressed('ult')) this.executor.castUlt();
      if (this.input.consumePressed('dodge')) {
        const mv = this.input.moveVector();
        const dir = _dd.set(
          mv.x * Math.cos(this.lastYaw) - mv.z * Math.sin(this.lastYaw),
          0,
          -mv.x * Math.sin(this.lastYaw) - mv.z * Math.cos(this.lastYaw),
        );
        if (dir.lengthSq() < 0.01) dir.set(Math.sin(player.heading), 0, Math.cos(player.heading));
        this.executor.roll(dir.normalize());
      }
    }
    this.executor.update(sdt, elapsed, player.heading);

    // 敌人 AI
    const ctx = {
      playerPos,
      playerDef: { def: this.stats.block.def, dodge: this.stats.block.dodge, element: this.stats.block.element },
      damagePlayer: (amount: number, _from: THREE.Vector3, poison?: { dps: number; dur: number }) =>
        this.damagePlayer(amount, poison),
      spawnProjectile: (opts: { from: THREE.Vector3; dir: THREE.Vector3; attack: MonsterAttack; damage: number }) => {
        this.projectiles.spawn({
          pos: _pp.copy(opts.from),
          dir: opts.dir,
          speed: opts.attack.speed ?? 8,
          life: opts.attack.life ?? 2,
          color: opts.attack.color ?? '#9a7ac8',
          poison: opts.attack.poison,
          onHit: (hitPos) => {
            if (Math.hypot(hitPos.x - playerPos.x, hitPos.z - playerPos.z) < 0.75) {
              this.damagePlayer(opts.damage, opts.attack.poison);
              return true;
            }
            return false;
          },
        });
      },
    };
    for (const e of this.enemies) e.update(sdt, elapsed, ctx);

    this.projectiles.update(sdt, elapsed);
    this.telegraph.update(sdt);
    const picked = this.drops.update(dt, playerPos, elapsed);
    for (const item of picked) {
      if (item.kind === 'coin') this.coins += item.amount;
      else this.herbsCollected += item.amount;
      this.hitfx.floatDamage(
        _dp.set(playerPos.x, playerPos.y + 1.9, playerPos.z),
        item.kind === 'coin' ? item.amount : item.amount,
        { heal: true },
      );
    }

    // 玩家毒 dot(受击与技能共用 CombatantStats 池)
    if (!this.playerDead && this.stats.poisonUntil > elapsed) {
      this.stats.hp -= this.stats.poisonDps * sdt;
      if (this.stats.hp <= 0) {
        this.stats.hp = 0;
        this.playerDead = true;
        this.deadT = 0;
        this.onPlayerDown?.();
      }
    }
  }

  private respawn(): void {
    this.playerDead = false;
    this.stats.hp = this.stats.block.maxHp;
    this.stats.mp = this.stats.block.maxMp;
    this.stats.poisonUntil = 0;
    this.world.player.position.set(0, this.world.heightAt(0, -16), -16);
    this.bus.emit('world:respawn', {});
  }

  get bossInfo(): { name: string; hp: number; maxHp: number } | null {
    const boss = this.enemies.find((e) => e.isBoss && e.alive);
    return boss ? { name: boss.def.name, hp: Math.max(0, boss.stats.hp), maxHp: boss.stats.block.maxHp } : null;
  }
}

const _dp = new THREE.Vector3();
const _dd = new THREE.Vector3();
const _pp = new THREE.Vector3();
