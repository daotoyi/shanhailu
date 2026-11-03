import * as THREE from 'three';
import { BEASTS, CATCH_ITEM, type BeastDef, type BestiaryEntry } from '../data/bestiary.js';
import { buildBeastBody, type BeastBody } from '../world/BeastBodies.js';
import { computeDamage } from '../combat/Stats.js';
import type { EventBus } from '../core/events.js';
import type { Enemy } from '../actor/Enemy.js';

export interface ContractedBeast {
  beastId: string;
  /** 阶(喂养升阶,属性倍率 1 + 0.15*(stage-1)) */
  stage: number;
  exp: number;
}

export interface CompanionState {
  def: BeastDef;
  stage: number;
  body: BeastBody;
  pos: THREE.Vector3;
  cd: number;
}

/**
 * 神兽系统(PROMPT §3.9,核心卖点):
 * 削弱 → 缚灵索契约(概率=剩余血量比×基础率) → 兽栏 → 协战 AI(跟随+主动技) → 喂养升阶 → 骑乘。
 * 图鉴记录(击杀/契约)联动。
 */
export class BeastSystem {
  /** 图鉴:beastId → 记录 */
  records: Record<string, BestiaryEntry> = {};
  /** 兽栏 */
  contracted: ContractedBeast[] = [];
  /** 出战位(神兽栏位按境界:凡俗 0 / 玄真 1 / 仙神 2) */
  activeIndex = -1;
  /** 骑乘(须 rideSpeed>0) */
  riding = false;
  private companion: CompanionState | null = null;
  private mountBody: BeastBody | null = null;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly bus: EventBus,
  ) {}

  private defOf(beastId: string): BeastDef {
    const d = BEASTS.find((b) => b.id === beastId);
    if (!d) throw new Error(`[Beast] 未知异兽 ${beastId}`);
    return d;
  }

  /* ---------- 图鉴 ---------- */

  recordKill(beastId: string): void {
    const rec = (this.records[beastId] ??= { kills: 0, caught: false });
    rec.kills++;
  }

  isKnown(beastId: string): boolean {
    return !!this.records[beastId];
  }

  /* ---------- 捕捉 ---------- */

  /** 尝试捕捉目标(消耗缚灵索);返回结果文本 */
  tryCatch(enemy: Enemy, luckBonus: number): { ok: boolean; beast?: BeastDef; msg: string } {
    const def = BEASTS.find((b) => b.monsterId === enemy.def.id);
    if (!def) return { ok: false, msg: '此物非异兽,缚灵索无用。' };
    void CATCH_ITEM;
    const hpRatio = Math.max(0, enemy.stats.hp / enemy.stats.block.maxHp);
    const rate = def.baseCatch * (1.25 - hpRatio) * (1 + luckBonus);
    if (Math.random() > rate) {
      enemy.stats.hp = Math.min(enemy.stats.block.maxHp, enemy.stats.hp * 1.15); // 失败激怒
      return { ok: false, msg: `${def.name}挣脱了缚灵索,反而被激怒!` };
    }
    enemy.takeDamage(99999, false, 1);
    this.contracted.push({ beastId: def.id, stage: 1, exp: 0 });
    const rec = (this.records[def.id] ??= { kills: 0, caught: false });
    rec.caught = true;
    this.bus.emit('beast:caught', { beastId: def.id, name: def.name });
    return { ok: true, beast: def, msg: `契约成立!${def.name}认可了你。` };
  }

  /** 附近可捕捉目标提示(供交互提示) */
  catchableNearby(enemies: Enemy[], playerPos: THREE.Vector3): { enemy: Enemy; def: BeastDef } | null {
    for (const e of enemies) {
      if (!e.alive || !e.def.catchable) continue;
      if (e.stats.hp / e.stats.block.maxHp > 0.6) continue;
      if (Math.hypot(e.position.x - playerPos.x, e.position.z - playerPos.z) < 2.6) {
        const def = BEASTS.find((b) => b.monsterId === e.def.id);
        if (def) return { enemy: e, def };
      }
    }
    return null;
  }

  /* ---------- 兽栏/出战 ---------- */

  setActive(index: number): void {
    if (index >= this.contracted.length) return;
    this.activeIndex = index;
    this.refreshCompanion();
  }

  /** 喂养升阶:兽饵 ×5 → stage+1(上限 5) */
  feed(beastId: string, foodCount: number): boolean {
    const c = this.contracted.find((x) => x.beastId === beastId);
    if (!c || c.stage >= 5 || foodCount < 5) return false;
    c.stage++;
    c.exp += 5;
    this.bus.emit('beast:fed', { beastId, stage: c.stage });
    if (this.companion && this.companion.def.id === beastId) this.companion.stage = c.stage;
    return true;
  }

  private stageMul(stage: number): number {
    return 1 + 0.15 * (stage - 1);
  }

  /** 出战实体刷新(切图/切换出战调用) */
  refreshCompanion(): void {
    if (this.companion) {
      this.scene.remove(this.companion.body.group);
      this.companion = null;
    }
    if (this.riding) this.setRiding(false);
    const active = this.contracted[this.activeIndex];
    if (!active) return;
    const def = this.defOf(active.beastId);
    const body = buildBeastBody(def);
    this.scene.add(body.group);
    this.companion = { def, stage: active.stage, body, pos: new THREE.Vector3(), cd: 0 };
  }

  /** 骑乘 */
  setRiding(on: boolean): boolean {
    if (on) {
      const active = this.contracted[this.activeIndex];
      if (!active || this.defOf(active.beastId).rideSpeed === undefined || this.defOf(active.beastId).rideSpeed === 0) return false;
      this.riding = true;
      if (this.companion) {
        // 出战神兽作为坐骑显示
        this.mountBody = this.companion.body;
        this.companion = null;
      }
    } else {
      this.riding = false;
      if (this.mountBody) {
        this.mountBody.group.removeFromParent();
        this.mountBody = null;
      }
      this.refreshCompanion();
    }
    this.bus.emit('beast:ride', { riding: on });
    return true;
  }

  get rideSpeedBonus(): number {
    if (!this.riding) return 0;
    const active = this.contracted[this.activeIndex];
    return active ? this.defOf(active.beastId).rideSpeed ?? 0 : 0;
  }

  get hasActive(): boolean {
    return this.companion !== null || this.mountBody !== null;
  }

  /* ---------- 帧更新:协战 AI ---------- */

  update(
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    playerHeading: number,
    enemies: Enemy[],
    hooks: {
      damageEnemy: (e: Enemy, amount: number, crit: boolean, em: number) => void;
      floatHeal: (amount: number) => void;
      playerAtk: number;
      playerElement: 'wood' | 'fire' | 'earth' | 'metal' | 'water';
    },
  ): void {
    // 坐骑跟随(骑乘中直接在玩家脚下)
    if (this.mountBody) {
      this.mountBody.group.position.set(playerPos.x, playerPos.y - 0.55, playerPos.z);
      this.mountBody.group.rotation.y = playerHeading;
      this.mountBody.animate(elapsed, true);
      return;
    }
    const c = this.companion;
    if (!c) return;
    // 跟随点:玩家身后 1.6m
    const tx = playerPos.x - Math.sin(playerHeading) * 1.6;
    const tz = playerPos.z - Math.cos(playerHeading) * 1.6;
    c.pos.lerp(_v1.set(tx, playerPos.y, tz), Math.min(1, dt * 4));
    c.body.group.position.copy(c.pos);
    c.cd -= dt;
    // 主动技能:最近敌人 < range → 释放
    const nearest = enemies
      .filter((e) => e.alive)
      .map((e) => ({ e, d: Math.hypot(e.position.x - c.pos.x, e.position.z - c.pos.z) }))
      .sort((a, b) => a.d - b.d)[0];
    if (nearest) {
      c.body.group.rotation.y = Math.atan2(nearest.e.position.x - c.pos.x, nearest.e.position.z - c.pos.z);
      if (c.cd <= 0 && nearest.d < c.def.companion.range + 1.5) {
        c.cd = c.def.companion.cd;
        const sk = c.def.companion;
        const mul = sk.multiplier * this.stageMul(c.stage);
        const atk = hooks.playerAtk * 0.7 * this.stageMul(c.stage);
        const result = computeDamage(
          { atk, crit: 0.05, critDmg: 1.4, element: c.def.element },
          { def: nearest.e.stats.block.def, dodge: nearest.e.stats.block.dodge, element: nearest.e.stats.block.element },
          mul,
        );
        if (!result.dodged) {
          hooks.damageEnemy(nearest.e, result.amount, result.crit, result.elementMul);
        }
        // 治疗附带(谣音)
        if (c.def.id === 'lushu') {
          const heal = Math.round(8 * this.stageMul(c.stage));
          hooks.floatHeal(heal);
        }
        void sk;
      }
    }
    c.body.animate(elapsed, true);
  }

  clearTransient(): void {
    if (this.companion) {
      this.companion.body.group.removeFromParent();
      this.companion = null;
    }
    if (this.mountBody) {
      this.mountBody.group.removeFromParent();
      this.mountBody = null;
    }
    this.riding = false;
  }

  serialize(): { records: Record<string, BestiaryEntry>; contracted: ContractedBeast[]; activeIndex: number } {
    return { records: { ...this.records }, contracted: this.contracted.map((c) => ({ ...c })), activeIndex: this.activeIndex };
  }

  deserialize(data: { records?: Record<string, BestiaryEntry>; contracted?: ContractedBeast[]; activeIndex?: number }): void {
    this.records = { ...(data.records ?? {}) };
    this.contracted = (data.contracted ?? []).map((c) => ({ ...c }));
    this.activeIndex = data.activeIndex ?? -1;
    this.refreshCompanion();
  }
}

const _v1 = new THREE.Vector3();
