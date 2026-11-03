/**
 * 键位表(数据驱动,唯一内容来源)。
 * 语义动作 → 默认物理键。触屏虚拟控件映射 M1 加入。
 * 注:camUp/camDown 为 M0 飞行调试相机所用,M1 跟随相机接入后腾挪。
 */

export type InputAction =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'dodge'
  | 'skill1'
  | 'skill2'
  | 'skill3'
  | 'ult'
  | 'interact'
  | 'camUp'
  | 'camDown'
  | 'sprint'
  | 'toggleDebug';

export const DEFAULT_KEY_BINDINGS: Readonly<Record<string, InputAction>> = {
  KeyW: 'forward',
  KeyS: 'back',
  KeyA: 'left',
  KeyD: 'right',
  Space: 'dodge',
  Digit1: 'skill1',
  Digit2: 'skill2',
  Digit3: 'skill3',
  KeyR: 'ult',
  KeyE: 'interact',
  KeyQ: 'camUp',
  KeyC: 'camDown',
  ShiftLeft: 'sprint',
  F3: 'toggleDebug',
};
