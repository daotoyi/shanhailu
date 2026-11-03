/**
 * UI 组件接口(与渲染后端无关,PROMPT §4.5)。
 * Web 阶段由 ui/dom/ 以 DOM 实现;M9 微信小游戏以 canvas 后端实现同一接口。
 * ui/ 之外的层只允许经这些接口使用 UI。
 */

export interface IUILabel {
  setText(text: string): void;
  setVariant(variant: 'normal' | 'dim' | 'gold' | 'title-lg'): void;
}

export interface IUIButton {
  setLabel(text: string): void;
  setEnabled(enabled: boolean): void;
  onClick(cb: () => void): void;
}

export interface IUIProgressBar {
  /** 0~1 */
  setRatio(ratio: number): void;
}

export interface IUIPanel {
  /** 显示(带入场动效) */
  open(): void;
  /** 隐藏(带出场动效),onClosed 在动效后回调 */
  close(onClosed?: () => void): void;
  get visible(): boolean;
  /** 面板根对象(后端相关,DOM 后端为 HTMLDivElement) */
  readonly root: unknown;
}

export interface IUIToast {
  show(text: string, durationMs?: number): void;
}

export interface IUIClickSink {
  /** 供界面层挂自定义节点(仅限 ui/ 内部使用) */
  appendChild(node: unknown): void;
  removeChild(node: unknown): void;
}
