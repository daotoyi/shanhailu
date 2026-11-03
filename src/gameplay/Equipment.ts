import { ITEMS, type EquipSlot } from '../data/items.js';
import { enhanceCost } from '../data/progression.js';
import type { Inventory } from './Inventory.js';
import type { EquipBonus } from './Progression.js';

export type EquipMap = Record<EquipSlot, { itemId: string; enhance: number } | null>;

/**
 * 装备与法宝(PROMPT §3.8):六栏/五品阶/强化(+0~+9)/属性聚合;武器可视由 Player 武器挂件读取。
 */
export class Equipment {
  slots: EquipMap = { weapon: null, head: null, body: null, belt: null, trinket: null, treasure: null };
  /** 炼药等级(放这里随档存) */
  alchemyLevel = 0;
  alchemyExp = 0;

  constructor(private readonly inventory: Inventory) {}

  bonus(): EquipBonus {
    let atk = 0;
    let def = 0;
    let hp = 0;
    for (const s of Object.values(this.slots)) {
      if (!s) continue;
      const def2 = ITEMS[s.itemId];
      if (!def2?.equip) continue;
      const lv = s.enhance ?? 0;
      const per = def2.equip.enhancePer ?? 1;
      atk += (def2.equip.atk ?? 0) + per * lv * (def2.equip.atk ? 1 : 0);
      def += (def2.equip.def ?? 0) + per * lv * (def2.equip.def ? 1 : 0);
      hp += (def2.equip.hp ?? 0) + per * lv * (def2.equip.hp ? 1 : 0);
    }
    return { atk, def, hp };
  }

  /** 穿戴:背包取物,原装备回背包 */
  equipFromBag(bagIndex: number): boolean {
    const s = this.inventory.slots[bagIndex];
    if (!s) return false;
    const def = ITEMS[s.itemId];
    if (!def?.equip) return false;
    const slot = def.equip.slot;
    const taken = this.inventory.removeAt(bagIndex, 1);
    if (!taken) return false;
    const old = this.slots[slot];
    this.slots[slot] = { itemId: taken.itemId, enhance: taken.enhance ?? 0 };
    if (old) this.inventory.add(old.itemId, 1, old.enhance);
    return true;
  }

  unequip(slot: EquipSlot): boolean {
    const s = this.slots[slot];
    if (!s) return false;
    const r = this.inventory.add(s.itemId, 1, s.enhance);
    if (r.overflow > 0) return false;
    this.slots[slot] = null;
    return true;
  }

  /** 强化:消耗贝币,+0~+9 */
  enhance(slot: EquipSlot): boolean {
    const s = this.slots[slot];
    if (!s || s.enhance >= 9) return false;
    const cost = enhanceCost(s.enhance);
    if (this.inventory.coins < cost) return false;
    this.inventory.coins -= cost;
    s.enhance = (s.enhance ?? 0) + 1;
    return true;
  }

  serialize(): { slots: EquipMap; alchemyLevel: number; alchemyExp: number } {
    return { slots: { ...this.slots }, alchemyLevel: this.alchemyLevel, alchemyExp: this.alchemyExp };
  }

  deserialize(data: { slots?: Record<string, { itemId: string; enhance: number } | null>; alchemyLevel?: number; alchemyExp?: number }): void {
    if (data.slots) {
      // 宽松合并:JSON 中可能缺个别槽位
      for (const k of Object.keys(this.slots) as EquipSlot[]) {
        const v = data.slots[k];
        if (v !== undefined) this.slots[k] = v;
      }
    }
    this.alchemyLevel = data.alchemyLevel ?? 0;
    this.alchemyExp = data.alchemyExp ?? 0;
  }
}
