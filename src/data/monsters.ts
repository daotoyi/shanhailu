import type { MonsterAttack } from './skills.js';
import type { Element } from './elements.js';

/** 怪物定义(PROMPT §3.5 AI 状态机 + Boss 多阶段);山海经异兽外观 M6/M7 接入 */
export interface MonsterDef {
  id: string;
  name: string;
  element: Element;
  hp: number;
  atk: number;
  def: number;
  exp: number;
  coins: [number, number];   // 掉落区间
  speed: number;
  aggroDist: number;
  attackDist: number;
  attackCd: number;
  /** 攻击池(按阶段取) */
  attacks: MonsterAttack[][];
  /** 阶段血量阈值(如 [0.5] = 50% 切第二池) */
  phaseThresholds?: number[];
  /** 外观 */
  body: 'ghost' | 'ape' | 'boss_ghost' | 'fox9' | 'lushu' | 'bifang';
  scale?: number;
  /** Boss */
  isBoss?: boolean;
  /** 可契约(缚灵索捕捉) */
  catchable?: boolean;
}

export const MONSTERS: Record<string, MonsterDef> = {
  yigui: {
    id: 'yigui',
    name: '疫鬼',
    element: 'water',
    hp: 70,
    atk: 9,
    def: 2,
    exp: 25,
    coins: [4, 9],
    speed: 2.6,
    aggroDist: 9,
    attackDist: 1.9,
    attackCd: 2.2,
    attacks: [[
      { name: '鬼爪', multiplier: 1.0, windup: 0.5, hitAt: 0.55, shape: 'cone', range: 2.1, arcDeg: 90, color: '#7a5fa8' },
    ]],
    body: 'ghost',
    scale: 1,
  },
  shanko: {
    id: 'shanko',
    name: '山魈',
    element: 'earth',
    hp: 95,
    atk: 12,
    def: 4,
    exp: 35,
    coins: [6, 14],
    speed: 3.2,
    aggroDist: 10,
    attackDist: 2.1,
    attackCd: 2.6,
    attacks: [[
      { name: '裂地捶', multiplier: 1.2, windup: 0.7, hitAt: 0.78, shape: 'circle', range: 2.4, telegraph: 0.7, color: '#b08a4a' },
    ]],
    body: 'ape',
    scale: 1.1,
  },
  yigui_boss: {
    id: 'yigui_boss',
    name: '疫鬼·瘴母',
    element: 'water',
    hp: 320,
    atk: 14,
    def: 4,
    exp: 160,
    coins: [30, 60],
    speed: 2.9,
    aggroDist: 14,
    attackDist: 2.4,
    attackCd: 2.0,
    attacks: [
      [
        { name: '瘴爪连击', multiplier: 1.1, windup: 0.5, hitAt: 0.55, shape: 'cone', range: 2.6, arcDeg: 100, color: '#7a5fa8' },
        { name: '毒瘴弹', multiplier: 1.0, windup: 0.6, hitAt: 0.7, shape: 'projectile', speed: 8.5, life: 2.2, poison: { dps: 5, dur: 3 }, color: '#9a7ac8' },
      ],
      [
        { name: '瘴爪连击', multiplier: 1.2, windup: 0.4, hitAt: 0.45, shape: 'cone', range: 2.8, arcDeg: 110, color: '#7a5fa8' },
        { name: '毒瘴弹幕', multiplier: 0.8, windup: 0.7, hitAt: 0.85, shape: 'projectile', speed: 7.5, life: 2.4, burst: 3, poison: { dps: 6, dur: 3 }, color: '#b07ae0' },
        { name: '瘴涛裂地', multiplier: 1.6, windup: 0.9, hitAt: 1.0, shape: 'circle', range: 3.6, telegraph: 0.9, color: '#8a5fb0' },
      ],
    ],
    phaseThresholds: [0.5],
    body: 'boss_ghost',
    scale: 1.6,
    isBoss: true,
  },

  /* ---- 可契约异兽(M6:削弱→缚灵索捕捉) ---- */
  beast_fox: {
    id: 'beast_fox',
    name: '九尾狐',
    element: 'wood',
    hp: 130,
    atk: 11,
    def: 3,
    exp: 70,
    coins: [10, 24],
    speed: 3.4,
    aggroDist: 8,
    attackDist: 2.0,
    attackCd: 2.4,
    attacks: [[
      { name: '狐火', multiplier: 1.0, windup: 0.5, hitAt: 0.6, shape: 'projectile', speed: 9, life: 1.6, color: '#f2a0c0' },
    ]],
    body: 'fox9',
    catchable: true,
  },
  beast_lushu: {
    id: 'beast_lushu',
    name: '鹿蜀',
    element: 'wood',
    hp: 160,
    atk: 8,
    def: 4,
    exp: 60,
    coins: [8, 18],
    speed: 3.8,
    aggroDist: 6,
    attackDist: 2.2,
    attackCd: 3.0,
    attacks: [[
      { name: '后蹄踢', multiplier: 0.9, windup: 0.55, hitAt: 0.65, shape: 'cone', range: 2.3, arcDeg: 120, color: '#c8a878' },
    ]],
    body: 'lushu',
    catchable: true,
  },
  beast_bifang: {
    id: 'beast_bifang',
    name: '毕方',
    element: 'fire',
    hp: 110,
    atk: 14,
    def: 2,
    exp: 80,
    coins: [12, 26],
    speed: 3.0,
    aggroDist: 10,
    attackDist: 2.6,
    attackCd: 2.2,
    attacks: [[
      { name: '讹火', multiplier: 1.15, windup: 0.6, hitAt: 0.7, shape: 'projectile', speed: 10, life: 1.5, color: '#ff9a4a' },
    ]],
    body: 'bifang',
    catchable: true,
  },
};
