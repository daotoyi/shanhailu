import type { IUIPanel } from './framework/types.js';

/**
 * 面板栈管理:开关动效统一收口,Esc 逐层关闭(M0 仅机制,M3 接入菜单面板)。
 */
export class UIManager {
  private readonly stack: IUIPanel[] = [];

  constructor(private readonly root: { append(node: unknown): void }) {}

  push(panel: IUIPanel): void {
    this.root.append(panel.root);
    panel.open();
    this.stack.push(panel);
  }

  pop(): void {
    const top = this.stack.pop();
    top?.close();
  }

  /** Esc 等场景:关最顶层 */
  closeTop(): boolean {
    if (this.stack.length === 0) return false;
    this.pop();
    return true;
  }

  get depth(): number {
    return this.stack.length;
  }
}
