/**
 * 角色色板(数据驱动,PROMPT §4.3 材质分区可换装)。
 * 形制基准:国漫仙侠公子特写 — 墨黑中分长发 / 金质翼冠嵌蓝宝石 /
 * 藏青外袍 + 月白宽交领 / 银灰云纹肩饰,整体冷调低饱和。
 * NPC/主角共用同一 Rig 生成器。
 */

export interface CharacterPalette {
  id: string;
  name: string;
  /** 衣袍主色 */
  robe: string;
  /** 袖口/衣缘 */
  trim: string;
  /** 腰带 */
  belt: string;
  /** 裤/腿 */
  pants: string;
  /** 肤色 */
  skin: string;
  /** 头发 */
  hair: string;
  /** 玉佩挂绳/木饰 */
  hat: string;
  /** 鞋 */
  shoe: string;
  /** 中衣(立领/宽 V 交领) */
  inner: string;
  /** 雾蓝细缘(取代朱砂) */
  accent: string;
  /** 青玉(玉佩/玉扣) */
  jade: string;
  /** 发冠古铜金 */
  crown: string;
  /** 冠上蓝宝石 */
  gem: string;
  /** 肩甲云纹银灰 */
  metal: string;
}

export const PALETTES: Record<string, CharacterPalette> = {
  /** 默认:主角赤松 — 藏青墨黑直裰 + 月白中衣 + 金冠蓝宝石 */
  apprentice: {
    id: 'apprentice',
    name: '药谷学徒',
    robe: '#252c3c',
    trim: '#e9edf0',
    belt: '#171c26',
    pants: '#202634',
    skin: '#f1d9c6',
    hair: '#12141d',
    hat: '#8d99a8',
    shoe: '#191d26',
    inner: '#dfe7ea',
    accent: '#6d8fac',
    jade: '#9cc3cc',
    crown: '#c0a269',
    gem: '#2f8fd0',
    metal: '#a9b4c0',
  },
  /** 九黎武士 — 赭红 + 玄黑 + 赤金 */
  miao: {
    id: 'miao',
    name: '九黎武士',
    robe: '#7c3b2e',
    trim: '#e8c98d',
    belt: '#241b16',
    pants: '#30251d',
    skin: '#d9a878',
    hair: '#17120d',
    hat: '#7a6242',
    shoe: '#2b2318',
    inner: '#efe1c4',
    accent: '#c18b3c',
    jade: '#b8b09a',
    crown: '#c9a04a',
    gem: '#b3543c',
    metal: '#b9a184',
  },
  /** 水族少女 — 靛青 + 月白 + 银青 */
  shui: {
    id: 'shui',
    name: '水族少女',
    robe: '#2f5a70',
    trim: '#eaf1ef',
    belt: '#203c4b',
    pants: '#27414e',
    skin: '#edd0ac',
    hair: '#182530',
    hat: '#7aa5a8',
    shoe: '#28323a',
    inner: '#f2f6f3',
    accent: '#5f9aa8',
    jade: '#8fc9c4',
    crown: '#b9c6cc',
    gem: '#3aa0c0',
    metal: '#a9c4cd',
  },
};

/** 默认玩家色板 */
export const DEFAULT_PALETTE_ID = 'apprentice';
