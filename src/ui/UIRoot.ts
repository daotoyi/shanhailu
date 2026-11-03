import { ServiceKey, provide } from '../core/Services.js';

/**
 * UI 舞台:虚拟设计分辨率 1280×720,整体等比缩放 + 居中(PROMPT §4.5)。
 * 全部界面元素挂载在 stage 之内;letterbox 露出 body 墨色底。
 */
export class UIRoot {
  private readonly rootEl: HTMLElement;
  readonly stage: HTMLElement;

  constructor() {
    const root = document.getElementById('ui-root');
    if (!root) throw new Error('[UI] #ui-root 缺失,请检查 index.html');
    this.rootEl = root;
    this.stage = document.createElement('div');
    this.stage.style.cssText = 'position:absolute;left:0;top:0;width:1280px;height:720px;';
    // 保留 index.html 预置节点(加载页骨架),整体挪入缩放舞台
    const existing = [...this.rootEl.children];
    this.rootEl.innerHTML = '';
    this.rootEl.appendChild(this.stage);
    for (const node of existing) this.stage.appendChild(node);
    provide<UIRoot>(ServiceKey.UIRoot, this);
  }

  /** 追加界面元素(仅 ui/ 层内部使用) */
  append(node: HTMLElement): void {
    this.stage.appendChild(node);
  }

  remove(node: HTMLElement): void {
    node.remove();
  }

  /** 依据窗口尺寸计算缩放(Engine resize 事件驱动) */
  resize(width: number, height: number): void {
    const scale = Math.min(width / 1280, height / 720);
    // 根节点固定 1280×720 并居中,仅视觉缩放;letterbox 露 body 墨色底
    this.rootEl.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }
}
