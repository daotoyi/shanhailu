import { RECIPES, type RecipeDef } from '../data/recipes.js';
import { ITEMS } from '../data/items.js';
import type { Inventory } from './Inventory.js';
import type { Equipment } from './Equipment.js';

export interface AlchemyResult {
  ok: boolean;
  reason?: string;
  critical?: boolean;
  output?: string;
  count?: number;
}

/** 炼药(PROMPT §3.10):配方/等级/失败率;等级提升提升成功率 */
export class Alchemy {
  constructor(
    private readonly inventory: Inventory,
    private readonly equipment: Equipment,
  ) {}

  get level(): number {
    return this.equipment.alchemyLevel;
  }

  list(): RecipeDef[] {
    return RECIPES;
  }

  successRate(r: RecipeDef): number {
    return Math.min(0.95, r.baseRate + this.level * 0.06);
  }

  canBrew(r: RecipeDef): boolean {
    return this.level >= r.levelReq && r.inputs.every(([id, n]) => this.inventory.countOf(id) >= n);
  }

  brew(recipeId: string): AlchemyResult {
    const r = RECIPES.find((x) => x.id === recipeId);
    if (!r) return { ok: false, reason: '未知配方' };
    if (this.level < r.levelReq) return { ok: false, reason: `炼药等级不足(需 Lv${r.levelReq})` };
    if (!r.inputs.every(([id, n]) => this.inventory.countOf(id) >= n)) {
      return { ok: false, reason: '药材不足' };
    }
    for (const [id, n] of r.inputs) this.inventory.remove(id, n);
    const rate = this.successRate(r);
    if (Math.random() > rate) {
      return { ok: false, reason: '火候失控,药材化为青烟……' };
    }
    const crit = Math.random() < 0.12;
    const count = r.outputCount + (crit ? 1 : 0);
    this.inventory.add(r.output, count);
    // 炼药经验 → 等级(每级 3 锅)
    this.equipment.alchemyExp++;
    if (this.equipment.alchemyExp >= (this.equipment.alchemyLevel + 1) * 3) {
      this.equipment.alchemyExp = 0;
      this.equipment.alchemyLevel = Math.min(6, this.equipment.alchemyLevel + 1);
    }
    return { ok: true, critical: crit, output: r.output, count };
  }

  /** 商店购买/出售(PROMPT §3.11) */
  buy(itemId: string, price: number, count = 1): boolean {
    const total = price * count;
    if (this.inventory.coins < total) return false;
    const r = this.inventory.add(itemId, count);
    if (r.overflow > 0) {
      this.inventory.remove(itemId, r.added);
      return false;
    }
    this.inventory.coins -= total;
    return true;
  }

  sellItem(bagIndex: number, count = 1): number {
    const s = this.inventory.slots[bagIndex];
    if (!s) return 0;
    const def = ITEMS[s.itemId];
    if (!def) return 0;
    const take = Math.min(count, s.count);
    const gain = def.sell * take;
    this.inventory.removeAt(bagIndex, take);
    this.inventory.coins += gain;
    return gain;
  }
}
