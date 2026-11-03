/**
 * 角色色板(数据驱动,PROMPT §4.3 材质分区可换装)。
 * 全部低饱和国风配色;NPC/主角共用同一 Rig 生成器。
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
  /** 斗笠/帽 */
  hat: string;
  /** 鞋 */
  shoe: string;
}

export const PALETTES: Record<string, CharacterPalette> = {
  /** 默认:药谷学徒(主角赤松) */
  apprentice: {
    id: 'apprentice',
    name: '药谷学徒',
    robe: '#5a7a5c',
    trim: '#e8e2d3',
    belt: '#9a6b45',
    pants: '#4a4438',
    skin: '#e8c39a',
    hair: '#2b2118',
    hat: '#c9b287',
    shoe: '#3a3226',
  },
  /** 苗疆(蚩尤风格,预置备用) */
  miao: {
    id: 'miao',
    name: '九黎武士',
    robe: '#7a3b32',
    trim: '#c9a25c',
    belt: '#2b2018',
    pants: '#33291f',
    skin: '#d9a878',
    hair: '#1a140e',
    hat: '#5c4a32',
    shoe: '#2b2318',
  },
  /** 水族(雨师妾风格) */
  shui: {
    id: 'shui',
    name: '水族少女',
    robe: '#3f6f7a',
    trim: '#e8e2d3',
    belt: '#2b4a52',
    pants: '#2f4a52',
    skin: '#edd0ac',
    hair: '#1d2a33',
    hat: '#7aa5a8',
    shoe: '#28323a',
  },
};

/** 默认玩家色板 */
export const DEFAULT_PALETTE_ID = 'apprentice';
