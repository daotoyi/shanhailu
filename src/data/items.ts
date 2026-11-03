/**
 * 物品表(数据驱动,PROMPT §3.8/3.10/3.11)。
 * 品阶:凡品(白)/灵品(绿)/宝品(蓝)/仙品(紫)/神品(金)
 */

export type ItemQuality = 0 | 1 | 2 | 3 | 4;
export type ItemType = 'herb' | 'pill' | 'material' | 'weapon' | 'armor' | 'trinket' | 'treasure';

export const QUALITY_COLOR: Record<ItemQuality, string> = {
  0: '#c8c4b8',
  1: '#5fd2a0',
  2: '#5fa8d2',
  3: '#b08ad2',
  4: '#ffd45e',
};

export const QUALITY_LABEL: Record<ItemQuality, string> = {
  0: '凡品',
  1: '灵品',
  2: '宝品',
  3: '仙品',
  4: '神品',
};

export type EquipSlot = 'weapon' | 'head' | 'body' | 'belt' | 'trinket' | 'treasure';

export const EQUIP_SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: '武器',
  head: '头',
  body: '身',
  belt: '腰',
  trinket: '饰',
  treasure: '法宝',
};

export interface ItemEffects {
  /** 使用效果 */
  healHp?: number;
  healMp?: number;
  curePoison?: boolean;
  /** 限时增益(秒) */
  atkBuff?: { value: number; dur: number };
  defBuff?: { value: number; dur: number };
}

export interface ItemDef {
  id: string;
  name: string;
  type: ItemType;
  quality: ItemQuality;
  desc: string;
  stack: number;
  /** 售价(贝币) */
  sell: number;
  /** 商店售价(0 = 不可买) */
  buy?: number;
  /** 使用型 */
  effects?: ItemEffects;
  /** 装备型:基础属性 */
  equip?: {
    slot: EquipSlot;
    atk?: number;
    def?: number;
    hp?: number;
    /** 每级强化成长 */
    enhancePer?: number;
    /** 武器外观 */
    model?: 'blade' | 'sword' | 'hoe';
  };
}

const it = (d: ItemDef): ItemDef => d;

export const ITEMS: Record<string, ItemDef> = {
  /* ---- 药材(炼药素材/直接售卖) ---- */
  herb_qingjingzhi: it({ id: 'herb_qingjingzhi', name: '青茎芝', type: 'herb', quality: 0, stack: 20, sell: 4, desc: '性凉解郁,炼药常备。' }),
  herb_xuejiancao: it({ id: 'herb_xuejiancao', name: '血见愁', type: 'herb', quality: 0, stack: 20, sell: 5, desc: '止血良草,叶背赤红。' }),
  herb_ningxinlian: it({ id: 'herb_ningxinlian', name: '凝心莲', type: 'herb', quality: 1, stack: 20, sell: 12, buy: 20, desc: '安神凝气,莲心微光。' }),
  herb_duanxuyin: it({ id: 'herb_duanxuyin', name: '断续茵', type: 'herb', quality: 1, stack: 20, sell: 10, buy: 18, desc: '续骨疗伤,生于岩隙。' }),
  /* ---- 材料 ---- */
  mat_ghost_marrows: it({ id: 'mat_ghost_marrows', name: '鬼髓', type: 'material', quality: 1, stack: 20, sell: 8, desc: '疫鬼残躯凝出的阴冷髓质。' }),
  mat_ape_fang: it({ id: 'mat_ape_fang', name: '山魈獠', type: 'material', quality: 0, stack: 20, sell: 6, desc: '坚硬如铁,可入兵刃。' }),
  /* ---- 丹药 ---- */
  pill_huixue: it({ id: 'pill_huixue', name: '回血丹', type: 'pill', quality: 0, stack: 10, sell: 6, buy: 12, effects: { healHp: 55 }, desc: '服之气血翻涌,回复 55 生命。' }),
  pill_ningshen: it({ id: 'pill_ningshen', name: '凝神丹', type: 'pill', quality: 0, stack: 10, sell: 6, buy: 12, effects: { healMp: 40 }, desc: '清心凝神,回复 40 灵力。' },
  ),
  pill_jiedu: it({ id: 'pill_jiedu', name: '解毒丹', type: 'pill', quality: 1, stack: 10, sell: 10, buy: 20, effects: { curePoison: true, healHp: 12 }, desc: '解百毒,兼复少量气血。' }),
  pill_longli: it({ id: 'pill_longli', name: '龙力散', type: 'pill', quality: 1, stack: 10, sell: 14, buy: 30, effects: { atkBuff: { value: 6, dur: 30 } }, desc: '一时龙象之力,30 秒攻击 +6。' }),
  pill_tiegu: it({ id: 'pill_tiegu', name: '铁骨散', type: 'pill', quality: 1, stack: 10, sell: 14, buy: 30, effects: { defBuff: { value: 5, dur: 30 } }, desc: '皮膜如铁,30 秒防御 +5。' }),
  /* ---- 武器 ---- */
  wp_hoe: it({ id: 'wp_hoe', name: '药锄', type: 'weapon', quality: 0, stack: 1, sell: 8, desc: '采药亦可防身。', equip: { slot: 'weapon', atk: 3, enhancePer: 1.2, model: 'hoe' } }),
  wp_bamboo_blade: it({ id: 'wp_bamboo_blade', name: '青竹刀', type: 'weapon', quality: 1, stack: 1, sell: 30, buy: 60, desc: '苗刀仿制,轻捷锐利。', equip: { slot: 'weapon', atk: 8, enhancePer: 2.0, model: 'blade' } }),
  wp_cold_iron_sword: it({ id: 'wp_cold_iron_sword', name: '寒铁剑', type: 'weapon', quality: 2, stack: 1, sell: 90, buy: 180, desc: '白帝边军制式,寒气逼人。', equip: { slot: 'weapon', atk: 15, enhancePer: 3.2, model: 'sword' } }),
  /* ---- 防具 ---- */
  ar_cloth: it({ id: 'ar_cloth', name: '粗布巾', type: 'armor', quality: 0, stack: 1, sell: 5, desc: '药谷弟子常服。', equip: { slot: 'head', def: 1, enhancePer: 0.5 } }),
  ar_leather: it({ id: 'ar_leather', name: '兽皮甲', type: 'armor', quality: 1, stack: 1, sell: 26, buy: 52, desc: '山魈皮鞣制,坚韧保暖。', equip: { slot: 'body', def: 4, hp: 15, enhancePer: 1.2 } }),
  ar_belt_rope: it({ id: 'ar_belt_rope', name: '束腰革带', type: 'armor', quality: 0, stack: 1, sell: 8, buy: 16, desc: '勒紧腰身,行动更稳。', equip: { slot: 'belt', def: 2, enhancePer: 0.6 } }),
  /* ---- 饰品/法宝 ---- */
  tr_jade_ring: it({ id: 'tr_jade_ring', name: '青玉戒', type: 'trinket', quality: 1, stack: 1, sell: 40, buy: 80, desc: '温润养气,灵力上限微增。', equip: { slot: 'trinket', hp: 20, enhancePer: 1.0 } }),
  tr_shennong_chi: it({ id: 'tr_shennong_chi', name: '神农尺', type: 'treasure', quality: 3, stack: 1, sell: 0, desc: '神农遗宝,可鉴百草、镇邪瘴。', equip: { slot: 'treasure', atk: 4, hp: 30, enhancePer: 2.0 } }),
};
