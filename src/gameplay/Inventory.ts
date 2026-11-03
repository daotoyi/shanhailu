import { ITEMS, type ItemDef } from '../data/items.js';

export interface BagStack {
  itemId: string;
  count: number;
  /** 装备强化等级(+0 起) */
  enhance?: number;
}

export interface BagAddResult {
  added: number;
  overflow: number;
}

const BAG_SIZE = 24;

/** 背包(PROMPT §3.11):格子/堆叠/增删改查;装备单独实例(强化等级) */
export class Inventory {
  slots: (BagStack | null)[] = Array(BAG_SIZE).fill(null);
  coins = 0;

  private defOf(itemId: string): ItemDef {
    const def = ITEMS[itemId];
    if (!def) throw new Error(`[Bag] 未知物品 ${itemId}`);
    return def;
  }

  countOf(itemId: string): number {
    let n = 0;
    for (const s of this.slots) if (s && s.itemId === itemId) n += s.count;
    return n;
  }

  /** 添加;装备类物品各占一格 */
  add(itemId: string, count = 1, enhance = 0): BagAddResult {
    const def = this.defOf(itemId);
    let left = count;
    let overflow = 0;
    if (def.type === 'weapon' || def.type === 'armor' || def.type === 'trinket' || def.type === 'treasure') {
      for (let i = 0; i < count; i++) {
        const empty = this.slots.findIndex((s) => s === null);
        if (empty < 0) {
          overflow += count - i;
          return { added: i, overflow };
        }
        this.slots[empty] = { itemId, count: 1, enhance };
      }
      return { added: count, overflow: 0 };
    }
    // 可堆叠
    for (const s of this.slots) {
      if (left <= 0) break;
      if (s && s.itemId === itemId && s.count < def.stack) {
        const put = Math.min(def.stack - s.count, left);
        s.count += put;
        left -= put;
      }
    }
    while (left > 0) {
      const empty = this.slots.findIndex((s) => s === null);
      if (empty < 0) {
        overflow = left;
        left = 0;
        break;
      }
      const put = Math.min(def.stack, left);
      this.slots[empty] = { itemId, count: put };
      left -= put;
    }
    return { added: count - overflow, overflow };
  }

  remove(itemId: string, count = 1): boolean {
    if (this.countOf(itemId) < count) return false;
    let left = count;
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      const s = this.slots[i];
      if (!s || s.itemId !== itemId) continue;
      const take = Math.min(s.count, left);
      s.count -= take;
      left -= take;
      if (s.count <= 0) this.slots[i] = null;
    }
    return true;
  }

  removeAt(index: number, count = 1): BagStack | null {
    const s = this.slots[index];
    if (!s) return null;
    const take = Math.min(s.count, count);
    const out: BagStack = { itemId: s.itemId, count: take, enhance: s.enhance };
    s.count -= take;
    if (s.count <= 0) this.slots[index] = null;
    return out;
  }

  /** 整理:同类合并 + 前置压实 */
  sort(): void {
    const stacks: BagStack[] = this.slots.filter((s): s is BagStack => s !== null);
    const merged: BagStack[] = [];
    for (const s of stacks) {
      const def = this.defOf(s.itemId);
      const same = def.stack > 1 ? merged.find((m) => m.itemId === s.itemId && m.count < def.stack) : undefined;
      if (same) {
        const put = Math.min(def.stack - same.count, s.count);
        same.count += put;
        s.count -= put;
        if (s.count > 0) merged.push(s);
      } else {
        merged.push(s);
      }
    }
    this.slots = Array(BAG_SIZE).fill(null);
    merged.forEach((s, i) => {
      this.slots[i] = s;
    });
  }

  /** 使用消耗品,返回效果(由调用方应用) */
  consume(index: number): ItemDef | null {
    const s = this.slots[index];
    if (!s) return null;
    const def = this.defOf(s.itemId);
    if (!def.effects) return null;
    s.count--;
    if (s.count <= 0) this.slots[index] = null;
    return def;
  }

  serialize(): { slots: (BagStack | null)[]; coins: number } {
    return { slots: this.slots.map((s) => (s ? { ...s } : null)), coins: this.coins };
  }

  deserialize(data: { slots?: (BagStack | null)[]; coins?: number }): void {
    if (data.slots) this.slots = data.slots.map((s) => (s ? { ...s } : null));
    this.coins = data.coins ?? 0;
  }
}
