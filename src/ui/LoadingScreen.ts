import type { IUIProgressBar } from './framework/types.js';
import { createProgressBar } from './dom/DomFactory.js';

/**
 * 国风加载页:复用 index.html 预置骨架(首帧即见,JS 接管进度)。
 * 「入荒」按钮即用户手势点 —— 解锁音频 + 启动主循环。
 */
export class LoadingScreen {
  private readonly splash: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly errorEl: HTMLElement;
  private readonly enterBtn: HTMLButtonElement;
  private readonly bar: IUIProgressBar;
  private entered = false;

  constructor() {
    const splash = document.getElementById('boot-splash');
    const status = document.getElementById('boot-status');
    const error = document.getElementById('boot-error');
    const enter = document.getElementById('boot-enter');
    const barFill = document.getElementById('boot-bar-fill');
    if (!splash || !status || !error || !enter) {
      throw new Error('[UI] 加载页骨架缺失,请检查 index.html');
    }
    this.splash = splash;
    this.statusEl = status;
    this.errorEl = error;
    this.enterBtn = enter as HTMLButtonElement;
    this.enterBtn.style.display = 'none';
    this.bar = barFill ? this.wrapBar(barFill) : createProgressBar();
  }

  private wrapBar(fill: HTMLElement): IUIProgressBar {
    return {
      setRatio(ratio: number) {
        fill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
      },
    };
  }

  setProgress(ratio: number, text?: string): void {
    this.bar.setRatio(ratio);
    if (text !== undefined) this.statusEl.textContent = text;
  }

  /** 资源就绪:亮出「入荒」,点击后进入游戏 */
  setReady(onEnter: () => void): void {
    this.setProgress(1, '大荒已就绪');
    this.enterBtn.style.display = 'block';
    this.enterBtn.addEventListener('click', () => {
      if (this.entered) return;
      this.entered = true;
      onEnter();
    });
  }

  showError(message: string): void {
    this.errorEl.textContent = message;
    this.errorEl.style.display = 'block';
    this.enterBtn.style.display = 'none';
    this.statusEl.textContent = '出错了';
  }

  /** 入场:淡出加载页并移除 */
  close(): void {
    this.splash.style.transition = 'opacity 0.6s ease';
    this.splash.style.opacity = '0';
    window.setTimeout(() => {
      this.splash.remove();
    }, 650);
  }
}
