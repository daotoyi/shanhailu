/**
 * 玩家技能表(数据驱动,PROMPT §3.5/3.6)。
 * 形状:cone(扇形)/circle(圆形);判定在伤害帧执行。
 */
import type { Element } from './elements.js';

export type SkillShape = 'cone' | 'circle' | 'projectile' | 'self';

export interface SkillDef {
  id: string;
  name: string;
  element: Element;
  multiplier: number;
  mpCost: number;
  cd: number;
  /** 动作时序(秒):windup → hitAt(判定)→ recover;总时长锁定移动 */
  windup: number;
  hitAt: number[];
  recover: number;
  shape: SkillShape;
  /** cone/circle 参数 */
  range?: number;
  arcDeg?: number;
  /** projectile 参数 */
  speed?: number;
  life?: number;
  /** 附加:中毒(dot 秒伤/时长)、治疗、充能获取 */
  poison?: { dps: number; dur: number };
  heal?: number;
  ultGain?: number;
  /** 特效色调(粒子) */
  color?: string;
  /** 大招 */
  isUlt?: boolean;
  desc?: string;
}

export const SKILLS: Record<string, SkillDef> = {
  basic_1: {
    id: 'basic_1', name: '挥击', element: 'wood', multiplier: 1.0, mpCost: 0, cd: 0,
    windup: 0.1, hitAt: [0.12], recover: 0.16, shape: 'cone', range: 2.0, arcDeg: 110, color: '#e8e2d3',
  },
  basic_2: {
    id: 'basic_2', name: '回身斩', element: 'wood', multiplier: 1.12, mpCost: 0, cd: 0,
    windup: 0.1, hitAt: [0.12], recover: 0.16, shape: 'cone', range: 2.0, arcDeg: 120, color: '#e8e2d3',
  },
  basic_3: {
    id: 'basic_3', name: '药锄重击', element: 'wood', multiplier: 1.4, mpCost: 0, cd: 0,
    windup: 0.16, hitAt: [0.18], recover: 0.24, shape: 'cone', range: 2.3, arcDeg: 130, color: '#e8e2d3', ultGain: 4,
  },
  skill_herbal_palm: {
    id: 'skill_herbal_palm', name: '青木掌', element: 'wood', multiplier: 1.8, mpCost: 10, cd: 3,
    windup: 0.16, hitAt: [0.2], recover: 0.3, shape: 'cone', range: 2.6, arcDeg: 95,
    color: '#5fd2a0', ultGain: 8, desc: '掌风裹青木灵气,击退前方敌人。',
  },
  skill_toxin_needle: {
    id: 'skill_toxin_needle', name: '药尘针', element: 'wood', multiplier: 1.1, mpCost: 14, cd: 6,
    windup: 0.2, hitAt: [], recover: 0.32, shape: 'projectile', speed: 11, life: 1.4,
    poison: { dps: 4, dur: 4 }, color: '#8fe0c8', ultGain: 8, desc: '掷出淬毒药针,命中后中毒。',
  },
  skill_tumble_kick: {
    id: 'skill_tumble_kick', name: '翻云腿', element: 'wood', multiplier: 1.5, mpCost: 18, cd: 8,
    windup: 0.14, hitAt: [0.18], recover: 0.34, shape: 'circle', range: 2.3,
    color: '#c9a25c', ultGain: 10, desc: '旋身横扫周身,并将自己向前推进一步。',
  },
  ult_shennong_field: {
    id: 'ult_shennong_field', name: '神农百草阵', element: 'wood', multiplier: 3.0, mpCost: 0, cd: 0.5,
    windup: 0.35, hitAt: [0.45], recover: 0.6, shape: 'circle', range: 4.2,
    heal: 45, isUlt: true, color: '#a8ffd8', desc: '百草灵阵轰然铺开,大范围杀伤并回复自身。(充能 100 释放)',
  },
};

/** 玩家技能槽位(1/2/3 + 大招) */
export const PLAYER_SKILL_SLOTS = ['skill_herbal_palm', 'skill_toxin_needle', 'skill_tumble_kick'] as const;
export const PLAYER_ULT = 'ult_shennong_field';

/** 怪物攻击模板 */
export interface MonsterAttack {
  name: string;
  multiplier: number;
  windup: number;
  /** 命中时机(相对攻击开始) */
  hitAt: number;
  shape: 'cone' | 'circle' | 'projectile';
  range?: number;
  arcDeg?: number;
  speed?: number;
  life?: number;
  poison?: { dps: number; dur: number };
  telegraph?: number; // 预警圈时长(=windup)
  color?: string;
  /** Boss 二阶段弹幕:连发次数 */
  burst?: number;
}
