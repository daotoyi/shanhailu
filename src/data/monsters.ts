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

  /* ================= M7 章节小怪与四大 Boss ================= */
  puppet: {
    id: 'puppet',
    name: '傀儡凶兽',
    element: 'earth',
    hp: 150,
    atk: 15,
    def: 6,
    exp: 90,
    coins: [14, 30],
    speed: 2.8,
    aggroDist: 9,
    attackDist: 2.4,
    attackCd: 2.6,
    attacks: [[
      { name: '重杵砸地', multiplier: 1.3, windup: 0.8, hitAt: 0.9, shape: 'circle', range: 2.6, telegraph: 0.8, color: '#b08a4a' },
    ]],
    body: 'ape',
    scale: 1.2,
  },
  golden_crow: {
    id: 'golden_crow',
    name: '三足金乌',
    element: 'fire',
    hp: 520,
    atk: 20,
    def: 6,
    exp: 300,
    coins: [50, 90],
    speed: 3.6,
    aggroDist: 16,
    attackDist: 3.0,
    attackCd: 1.9,
    attacks: [
      [
        { name: '阳炎弹', multiplier: 1.1, windup: 0.5, hitAt: 0.62, shape: 'projectile', speed: 10, life: 2.0, color: '#ffd45e' },
        { name: '金羽扫', multiplier: 1.2, windup: 0.5, hitAt: 0.55, shape: 'cone', range: 3.0, arcDeg: 110, color: '#ffb45e' },
      ],
      [
        { name: '十日齐辉', multiplier: 0.9, windup: 0.8, hitAt: 0.9, shape: 'projectile', speed: 9, life: 2.4, burst: 5, color: '#ffcf4a' },
        { name: '坠日', multiplier: 1.7, windup: 0.95, hitAt: 1.05, shape: 'circle', range: 3.8, telegraph: 0.95, color: '#ff8a2a' },
      ],
    ],
    phaseThresholds: [0.5],
    body: 'ghost',
    scale: 1.5,
    isBoss: true,
  },
  mirage_demon: {
    id: 'mirage_demon',
    name: '蜃妖',
    element: 'water',
    hp: 460,
    atk: 18,
    def: 5,
    exp: 280,
    coins: [46, 84],
    speed: 3.2,
    aggroDist: 13,
    attackDist: 2.6,
    attackCd: 2.0,
    attacks: [
      [
        { name: '蜃泡', multiplier: 1.1, windup: 0.5, hitAt: 0.62, shape: 'projectile', speed: 9, life: 2.0, color: '#8fd2c8' },
      ],
      [
        { name: '镜花水月', multiplier: 0.75, windup: 0.7, hitAt: 0.8, shape: 'projectile', speed: 8, life: 2.2, burst: 4, color: '#a8e0d8' },
        { name: '蜃楼倾', multiplier: 1.5, windup: 0.9, hitAt: 1.0, shape: 'circle', range: 3.4, telegraph: 0.9, color: '#6fb8c8' },
      ],
    ],
    phaseThresholds: [0.6, 0.3],
    body: 'ghost',
    scale: 1.35,
    isBoss: true,
  },
  water_assassin: {
    id: 'water_assassin',
    name: '水族刺客',
    element: 'water',
    hp: 560,
    atk: 22,
    def: 7,
    exp: 340,
    coins: [56, 100],
    speed: 4.2,
    aggroDist: 15,
    attackDist: 2.2,
    attackCd: 1.6,
    attacks: [
      [
        { name: '寒泉刺', multiplier: 1.2, windup: 0.4, hitAt: 0.48, shape: 'cone', range: 2.8, arcDeg: 80, color: '#5f9ab8' },
        { name: '水解斩', multiplier: 1.0, windup: 0.55, hitAt: 0.62, shape: 'projectile', speed: 11, life: 1.6, color: '#7fc8d8' },
      ],
      [
        { name: '玄冰连刺', multiplier: 0.9, windup: 0.5, hitAt: 0.58, shape: 'cone', range: 3.0, arcDeg: 100, color: '#a8d8e8' },
        { name: '沧浪一击', multiplier: 1.8, windup: 0.9, hitAt: 1.0, shape: 'circle', range: 3.2, telegraph: 0.9, color: '#5f9ab8' },
      ],
    ],
    phaseThresholds: [0.5],
    body: 'ghost',
    scale: 1.3,
    isBoss: true,
  },
  ghost_king: {
    id: 'ghost_king',
    name: '幽都鬼王',
    element: 'water',
    hp: 640,
    atk: 24,
    def: 8,
    exp: 400,
    coins: [64, 110],
    speed: 2.6,
    aggroDist: 14,
    attackDist: 2.6,
    attackCd: 2.1,
    attacks: [
      [
        { name: '索魂链', multiplier: 1.2, windup: 0.6, hitAt: 0.7, shape: 'cone', range: 3.2, arcDeg: 90, color: '#8a5fb0' },
        { name: '鬼火燎原', multiplier: 1.0, windup: 0.65, hitAt: 0.75, shape: 'projectile', speed: 8, life: 2.2, poison: { dps: 5, dur: 3 }, color: '#a878e0' },
      ],
      [
        { name: '万鬼夜行', multiplier: 0.85, windup: 0.8, hitAt: 0.9, shape: 'projectile', speed: 7.5, life: 2.6, burst: 5, poison: { dps: 6, dur: 3 }, color: '#b07ae0' },
        { name: '幽都开门', multiplier: 1.7, windup: 1.0, hitAt: 1.1, shape: 'circle', range: 4.0, telegraph: 1.0, color: '#7a4fb0' },
      ],
    ],
    phaseThresholds: [0.5],
    body: 'boss_ghost',
    scale: 1.7,
    isBoss: true,
  },
  xiangliu: {
    id: 'xiangliu',
    name: '相柳',
    element: 'water',
    hp: 820,
    atk: 26,
    def: 9,
    exp: 520,
    coins: [80, 140],
    speed: 2.8,
    aggroDist: 16,
    attackDist: 2.8,
    attackCd: 1.8,
    attacks: [
      [
        { name: '九首吐沫', multiplier: 1.0, windup: 0.55, hitAt: 0.68, shape: 'projectile', speed: 9, life: 2.2, poison: { dps: 6, dur: 3 }, color: '#7ac86a' },
        { name: '蛇尾横扫', multiplier: 1.25, windup: 0.6, hitAt: 0.68, shape: 'cone', range: 3.4, arcDeg: 130, color: '#5a8a4a' },
      ],
      [
        { name: '九泉喷涌', multiplier: 0.8, windup: 0.75, hitAt: 0.88, shape: 'projectile', speed: 8, life: 2.6, burst: 6, poison: { dps: 7, dur: 4 }, color: '#8ad86a' },
        { name: '泽国千里', multiplier: 1.6, windup: 1.0, hitAt: 1.1, shape: 'circle', range: 4.2, telegraph: 1.0, poison: { dps: 5, dur: 4 }, color: '#4a7a3a' },
        { name: '吞天噬地', multiplier: 1.4, windup: 0.7, hitAt: 0.8, shape: 'cone', range: 3.8, arcDeg: 140, color: '#3a6a2a' },
      ],
    ],
    phaseThresholds: [0.66, 0.33],
    body: 'boss_ghost',
    scale: 1.9,
    isBoss: true,
  },
  gonggong: {
    id: 'gonggong',
    name: '共工',
    element: 'water',
    hp: 1000,
    atk: 30,
    def: 10,
    exp: 800,
    coins: [120, 200],
    speed: 3.0,
    aggroDist: 18,
    attackDist: 3.0,
    attackCd: 1.7,
    attacks: [
      [
        { name: '玄水斩', multiplier: 1.15, windup: 0.5, hitAt: 0.6, shape: 'cone', range: 3.2, arcDeg: 100, color: '#5f9ad8' },
        { name: '洪涛弹', multiplier: 1.05, windup: 0.6, hitAt: 0.72, shape: 'projectile', speed: 10, life: 2.2, color: '#7fb8e8' },
      ],
      [
        { name: '百川灌顶', multiplier: 0.85, windup: 0.75, hitAt: 0.9, shape: 'projectile', speed: 8.5, life: 2.6, burst: 5, color: '#8fc8f0' },
        { name: '天柱余威', multiplier: 1.6, windup: 0.95, hitAt: 1.05, shape: 'circle', range: 4.0, telegraph: 0.95, color: '#4a7ab8' },
      ],
      [
        { name: '不周之怒', multiplier: 1.9, windup: 1.05, hitAt: 1.15, shape: 'circle', range: 4.6, telegraph: 1.05, color: '#3a6ab0' },
        { name: '水漫大荒', multiplier: 0.9, windup: 0.8, hitAt: 0.92, shape: 'projectile', speed: 8, life: 2.8, burst: 7, poison: { dps: 6, dur: 4 }, color: '#6fa8d8' },
        { name: '共工触山', multiplier: 1.5, windup: 0.7, hitAt: 0.8, shape: 'cone', range: 4.0, arcDeg: 150, color: '#2f5aa0' },
      ],
    ],
    phaseThresholds: [0.66, 0.33],
    body: 'boss_ghost',
    scale: 2.1,
    isBoss: true,
  },
};
