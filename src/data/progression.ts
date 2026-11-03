import type { EquipSlot } from './items.js';

/** 境界表(PROMPT §3.7):突破解锁技能槽/被动/神兽栏位 */
export interface RealmDef {
  id: string;
  name: string;
  /** 该境界所需等级(达到即可突破) */
  levelReq: number;
  hpPct: number;
  atkPct: number;
  defPct: number;
  unlocks: string[];
}

export const REALMS: RealmDef[] = [
  { id: 'fansu', name: '凡俗', levelReq: 1, hpPct: 1.0, atkPct: 1.0, defPct: 1.0, unlocks: [] },
  { id: 'lianqi', name: '炼气', levelReq: 4, hpPct: 1.12, atkPct: 1.12, defPct: 1.08, unlocks: ['灵力上限扩容'] },
  { id: 'zhenqi', name: '真气', levelReq: 8, hpPct: 1.26, atkPct: 1.25, defPct: 1.18, unlocks: ['被动·药理:丹药效果 +25%'] },
  { id: 'xuanzhen', name: '玄真', levelReq: 13, hpPct: 1.45, atkPct: 1.4, defPct: 1.3, unlocks: ['神兽栏位 +1'] },
  { id: 'shenwu', name: '神武', levelReq: 19, hpPct: 1.7, atkPct: 1.6, defPct: 1.45, unlocks: ['被动·行药:受毒时间减半'] },
  { id: 'xianshen', name: '仙神', levelReq: 26, hpPct: 2.0, atkPct: 1.85, defPct: 1.65, unlocks: ['神兽栏位 +2'] },
];

/** 经验曲线:升到 L 级所需累计经验 */
export function expForLevel(level: number): number {
  return Math.round(60 * Math.pow(level, 1.65));
}

/** 等级成长:每级基础提升 */
export const PER_LEVEL = { hp: 12, atk: 2.2, def: 1.1 };

/** 商店货架(大荒城) */
export interface ShopShelf {
  id: string;
  name: string;
  stock: { itemId: string; price: number }[];
}

export const CITY_SHOP: ShopShelf = {
  id: 'city_shop',
  name: '百草集 · 商铺',
  stock: [
    { itemId: 'pill_huixue', price: 12 },
    { itemId: 'pill_ningshen', price: 12 },
    { itemId: 'pill_jiedu', price: 20 },
    { itemId: 'pill_longli', price: 30 },
    { itemId: 'pill_tiegu', price: 30 },
    { itemId: 'herb_ningxinlian', price: 20 },
    { itemId: 'herb_duanxuyin', price: 18 },
    { itemId: 'wp_bamboo_blade', price: 60 },
    { itemId: 'ar_leather', price: 52 },
    { itemId: 'ar_belt_rope', price: 16 },
    { itemId: 'tr_jade_ring', price: 80 },
    { itemId: 'ar_cloth', price: 14 },
    { itemId: 'item_fulingsuo', price: 45 },
    { itemId: 'pill_beast_food', price: 10 },
  ],
};

/** 强化费用(等级 → 贝币) */
export function enhanceCost(level: number): number {
  return 10 + level * level * 6;
}

/** 掉落表(怪物 → 物品概率) */
export const DROP_TABLE: Record<string, { itemId: string; chance: number; count?: [number, number] }[]> = {
  yigui: [
    { itemId: 'mat_ghost_marrows', chance: 0.6, count: [1, 2] },
    { itemId: 'pill_huixue', chance: 0.15 },
  ],
  shanko: [
    { itemId: 'mat_ape_fang', chance: 0.65, count: [1, 2] },
    { itemId: 'pill_ningshen', chance: 0.15 },
  ],
  yigui_boss: [
    { itemId: 'mat_ghost_marrows', chance: 1.0, count: [3, 5] },
    { itemId: 'tr_shennong_chi', chance: 0.0 },
    { itemId: 'pill_longli', chance: 0.4 },
  ],
};
