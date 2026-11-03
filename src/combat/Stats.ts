import { elementMultiplier, type Element } from '../data/elements.js';

/** 战斗属性快照(只读数值;装备/境界加成由上层合并后注入) */
export interface StatBlock {
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  crit: number;      // 0~1
  critDmg: number;   // 倍率(1.5 = 150% 总伤)
  dodge: number;     // 0~1
  element: Element;
}

export const BASE_PLAYER_STATS: StatBlock = {
  maxHp: 140,
  maxMp: 70,
  atk: 15,
  def: 5,
  crit: 0.06,
  critDmg: 1.5,
  dodge: 0.03,
  element: 'wood',
};

/** 当前动态池(hp/mp 随战斗变化) */
export class CombatantStats {
  hp: number;
  mp: number;
  /** 大招充能 0~100 */
  ultCharge = 0;
  /** 中毒 dot(dot 每跳,秒) */
  poisonUntil = 0;
  poisonDps = 0;

  constructor(public block: StatBlock) {
    this.hp = block.maxHp;
    this.mp = block.maxMp;
  }

  heal(v: number): number {
    const before = this.hp;
    this.hp = Math.min(this.block.maxHp, this.hp + v);
    return this.hp - before;
  }

  healMp(v: number): void {
    this.mp = Math.min(this.block.maxMp, this.mp + v);
  }

  spendMp(v: number): boolean {
    if (this.mp < v) return false;
    this.mp -= v;
    return true;
  }

  addUlt(v: number): void {
    this.ultCharge = Math.min(100, this.ultCharge + v);
  }
}

/**
 * 伤害结算(PROMPT §3.5 公式):
 * 伤害 = (攻击×倍率 − 防御×0.5) × 五行系数 × 暴击(1.75×爆伤) × U(0.95~1.05);下限 = 攻击×0.05
 */
export interface DamageResult {
  amount: number;
  crit: boolean;
  elementMul: number;
  dodged: boolean;
}

export function computeDamage(
  attacker: { atk: number; crit: number; critDmg: number; element: Element },
  defender: { def: number; dodge: number; element: Element },
  multiplier: number,
): DamageResult {
  if (Math.random() < defender.dodge) {
    return { amount: 0, crit: false, elementMul: 1, dodged: true };
  }
  const em = elementMultiplier(attacker.element, defender.element);
  const isCrit = Math.random() < attacker.crit;
  const critMul = isCrit ? 1.75 * attacker.critDmg : 1.0;
  const raw = (attacker.atk * multiplier - defender.def * 0.5) * em * critMul * (0.95 + Math.random() * 0.1);
  const floor = attacker.atk * 0.05;
  return { amount: Math.max(floor, Math.round(raw)), crit: isCrit, elementMul: em, dodged: false };
}
