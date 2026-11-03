/**
 * 加载页接口(canvas 后端与 DOM 后端共用;M9 POC 证明 UI 组件接口与渲染后端无关)。
 */
export interface LoadingScreenLike {
  setProgress(ratio: number, text?: string): void;
  setReady(onEnter: () => void): void;
  showError(message: string): void;
  close(): void;
}
