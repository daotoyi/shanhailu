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
  body: 'ghost' | 'ape' | 'boss_ghost';
  scale?: number;
  /** Boss */
  isBoss?: boolean;
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
};
