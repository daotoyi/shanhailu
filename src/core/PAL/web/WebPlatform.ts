import type { IPALPlatform, PlatformId } from '../types.js';

/**
 * Web 平台实现:表面获取、尺寸事件、时间、震动。
 * 此处是宿主 DOM API 的指定栖身地(见 DESIGN.md §2 DOM 边界约定)。
 */
export class WebPlatform implements IPALPlatform {
  readonly id: PlatformId = 'web';
  readonly isTouch: boolean;

  constructor() {
    this.isTouch =
      typeof navigator !== 'undefined' &&
      (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
  }

  getSurface(): HTMLCanvasElement {
    const el = document.getElementById('game-canvas');
    if (!(el instanceof HTMLCanvasElement)) {
      throw new Error('[PAL] #game-canvas 缺失或类型错误,请检查 index.html');
    }
    return el;
  }

  onResize(cb: (width: number, height: number, dpr: number) => void): () => void {
    const fire = () => {
      cb(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, 2));
    };
    window.addEventListener('resize', fire);
    fire();
    return () => window.removeEventListener('resize', fire);
  }

  now(): number {
    return performance.now();
  }

  vibrate(ms: number): void {
    navigator.vibrate?.(ms);
  }
}
