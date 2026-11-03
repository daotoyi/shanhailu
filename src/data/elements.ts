/** 五行(PROMPT §2.2):木→土→水→火→金→木 循环克制 ×1.3,被克 ×0.7 */

export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export const ELEMENT_LABEL: Record<Element, string> = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水',
};

export const ELEMENT_COLOR: Record<Element, string> = {
  wood: '#5f8f5a',
  fire: '#c04a32',
  earth: '#b08a4a',
  metal: '#c8c8c0',
  water: '#3f6f8f',
};

/** 克制:returns 攻方对守方的系数 */
export function elementMultiplier(atk: Element, def: Element): number {
  const cycle: Record<Element, Element> = {
    wood: 'earth',
    earth: 'water',
    water: 'fire',
    fire: 'metal',
    metal: 'wood',
  };
  if (cycle[atk] === def) return 1.3;
  if (cycle[def] === atk) return 0.7;
  return 1.0;
}
