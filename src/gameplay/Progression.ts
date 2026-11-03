import type { EventBus } from '../core/events.js';
import { PER_LEVEL, REALMS, expForLevel, type RealmDef } from '../data/progression.js';
import { BASE_PLAYER_STATS, type StatBlock } from '../combat/Stats.js';
import type { Inventory } from './Inventory.js';

/** 装备聚合加成来源 */
export interface EquipBonus {
  atk: number;
  def: number;
  hp: number;
}

/**
 * 成长(PROMPT §3.7):等级/经验/境界突破;聚合最终属性。
 * exp 来源:任务奖励 + 击杀。
 */
export class Progression {
  level = 1;
  exp = 0;
  realmIndex = 0;
  /** 聚合后的属性(装备/境界加成已含) */
  finalStats: StatBlock = { ...BASE_PLAYER_STATS };
  /** 限时增益(战斗用) */
  atkBuff = 0;
  atkBuffUntil = 0;
  defBuff = 0;
  defBuffUntil = 0;

  constructor(
    private readonly bus: EventBus,
    private readonly inventory: Inventory,
    private readonly equipBonus: () => EquipBonus,
  ) {}

  get realm(): RealmDef {
    return REALMS[this.realmIndex]!;
  }

  get realmList(): readonly RealmDef[] {
    return REALMS;
  }

  get canBreakthrough(): boolean {
    const next = REALMS[this.realmIndex + 1];
    return !!next && this.level >= next.levelReq;
  }

  /** 击杀经验表怪物 def.exp 由调用方传入 */
  gainExp(amount: number): void {
    if (amount <= 0) return;
    this.exp += amount;
    while (this.level < 40 && this.exp >= expForLevel(this.level + 1)) {
      this.exp -= expForLevel(this.level + 1);
      this.level++;
      this.recompute();
      this.bus.emit('prog:levelup', { level: this.level });
    }
    this.bus.emit('prog:exp', { exp: this.exp, level: this.level });
  }

  breakthrough(): boolean {
    if (!this.canBreakthrough) return false;
    this.realmIndex++;
    this.recompute();
    this.bus.emit('prog:breakthrough', { realm: this.realm.name, unlocks: this.realm.unlocks });
    return true;
  }

  applyBuff(kind: 'atk' | 'def', value: number, durSec: number, elapsed: number): void {
    if (kind === 'atk') {
      this.atkBuff = value;
      this.atkBuffUntil = elapsed + durSec;
    } else {
      this.defBuff = value;
      this.defBuffUntil = elapsed + durSec;
    }
    this.recompute();
  }

  update(elapsed: number): void {
    if ((this.atkBuffUntil > 0 && this.atkBuffUntil <= elapsed && this.atkBuff !== 0) ||
        (this.defBuffUntil > 0 && this.defBuffUntil <= elapsed && this.defBuff !== 0)) {
      this.atkBuff = this.atkBuffUntil <= elapsed ? 0 : this.atkBuff;
      this.defBuff = this.defBuffUntil <= elapsed ? 0 : this.defBuff;
      this.recompute();
    }
  }

  /** 重算最终属性(基础 + 每级成长 + 境界 + 装备 + 增益) */
  recompute(): StatBlock {
    const realm = this.realm;
    const eb = this.equipBonus();
    const base = BASE_PLAYER_STATS;
    const lvHp = base.maxHp + PER_LEVEL.hp * (this.level - 1) + eb.hp;
    const lvAtk = base.atk + PER_LEVEL.atk * (this.level - 1) + eb.atk + this.atkBuff;
    const lvDef = base.def + PER_LEVEL.def * (this.level - 1) + eb.def + this.defBuff;
    this.finalStats = {
      ...base,
      maxHp: Math.round(lvHp * realm.hpPct),
      maxMp: Math.round(base.maxMp * (1 + (realm.hpPct - 1) * 0.6)),
      atk: Math.round(lvAtk * realm.atkPct * 10) / 10,
      def: Math.round(lvDef * realm.defPct * 10) / 10,
    };
    return this.finalStats;
  }

  serialize(): { level: number; exp: number; realmIndex: number } {
    return { level: this.level, exp: this.exp, realmIndex: this.realmIndex };
  }

  deserialize(data: { level?: number; exp?: number; realmIndex?: number }): void {
    this.level = data.level ?? 1;
    this.exp = data.exp ?? 0;
    this.realmIndex = data.realmIndex ?? 0;
    this.recompute();
  }
}
