/**
 * 山海经异兽库(PROMPT §2.6/§3.9):图鉴+怪物+神兽三用。
 * 原文引句为《山海经》公有领域;神兽契约后协战。
 */

export interface BeastDef {
  id: string;
  name: string;
  /** 《山海经》原文引句(图鉴展示) */
  quote: string;
  quoteSrc: string;
  element: 'wood' | 'fire' | 'earth' | 'metal' | 'water';
  /** 对应怪物定义 id(战斗实体复用 MonsterDef) */
  monsterId: string;
  /** 契约基础率(剩余血量比例 × 此值) */
  baseCatch: number;
  /** 协战技能 */
  companion: {
    name: string;
    /** 冷却(秒) */
    cd: number;
    multiplier: number;
    shape: 'cone' | 'circle' | 'projectile';
    range: number;
    color: string;
    desc: string;
  };
  /** 骑乘速度加成(0 = 不可骑) */
  rideSpeed?: number;
  /** 外观拼装 */
  body: 'fox9' | 'lushu' | 'bifang' | 'birdbasic';
  lore: string;
}

export const BEASTS: BeastDef[] = [
  {
    id: 'jiuweihu',
    name: '九尾狐',
    quote: '青丘之山,有兽焉,其状如狐而九尾,其音如婴儿,能食人,食者不蛊。',
    quoteSrc: '《山海经·南山经》',
    element: 'wood',
    monsterId: 'beast_fox',
    baseCatch: 0.42,
    companion: {
      name: '魅火',
      cd: 7,
      multiplier: 1.6,
      shape: 'projectile',
      range: 10,
      color: '#f2a0c0',
      desc: '喷吐魅色狐火,命中后灼烧。',
    },
    rideSpeed: 0,
    body: 'fox9',
    lore: '青丘之狐,九尾摇曳。传说食其肉者不逢妖邪之气——但赤松只想和它交个朋友。',
  },
  {
    id: 'lushu',
    name: '鹿蜀',
    quote: '杻阳之山,有兽焉,其状如马而白首,其文如虎而赤尾,其音如谣,佩之宜子孙。',
    quoteSrc: '《山海经·南山经》',
    element: 'wood',
    monsterId: 'beast_lushu',
    baseCatch: 0.55,
    companion: {
      name: '谣音',
      cd: 9,
      multiplier: 1.1,
      shape: 'circle',
      range: 2.6,
      color: '#e8c090',
      desc: '鸣声如歌,震慑周身之敌并抚愈主人。',
    },
    rideSpeed: 3.2,
    body: 'lushu',
    lore: '状如马而纹如虎,啼声像远古的歌谣。骑上它,大荒的路会短一半。',
  },
  {
    id: 'bifang',
    name: '毕方',
    quote: '章莪之山,有鸟焉,其状如鹤,一足,赤文青质而白喙,名曰毕方,其鸣自叫也,见则其邑有讹火。',
    quoteSrc: '《山海经·西山经》',
    element: 'fire',
    monsterId: 'beast_bifang',
    baseCatch: 0.38,
    companion: {
      name: '讹火',
      cd: 8,
      multiplier: 1.8,
      shape: 'cone',
      range: 3.2,
      color: '#ff9a4a',
      desc: '独足踏火,扇出扇形烈焰。',
    },
    rideSpeed: 0,
    body: 'bifang',
    lore: '一足青鸟,所过之处有火。它落在谁家屋顶,谁家就该小心灶膛了。',
  },
];

/** 图鉴记录(击杀/契约进度) */
export interface BestiaryEntry {
  kills: number;
  caught: boolean;
}

export const CATCH_ITEM = 'item_fulingsuo';
