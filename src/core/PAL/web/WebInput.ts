import type { IPALInput, PALKeyEvent, PALPointerEvent, PALTouchEvent } from '../types.js';

type Fn = () => void;

/**
 * Web 输入实现:Keyboard + Pointer Events + Wheel + Touch。
 * 语义映射(动作/键位)不在此层 —— 本层只吐原始事件,语义见 core/Input。
 */
export class WebInput implements IPALInput {
  private readonly surface: HTMLCanvasElement;

  constructor(surface: HTMLCanvasElement) {
    this.surface = surface;
  }

  onKeyDown(cb: (e: PALKeyEvent) => void): Fn {
    const fn = (ev: KeyboardEvent) => {
      // F3/F5 等浏览器快捷键在游戏内由我们接管
      if (ev.code === 'F3') ev.preventDefault();
      cb({ code: ev.code, type: 'down', repeat: ev.repeat });
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }

  onKeyUp(cb: (e: PALKeyEvent) => void): Fn {
    const fn = (ev: KeyboardEvent) => {
      cb({ code: ev.code, type: 'up', repeat: ev.repeat });
    };
    window.addEventListener('keyup', fn);
    return () => window.removeEventListener('keyup', fn);
  }

  onPointer(cb: (e: PALPointerEvent) => void): Fn {
    const conv = (ev: PointerEvent, type: PALPointerEvent['type']): PALPointerEvent => ({
      type,
      pointerId: ev.pointerId,
      pointerType: ev.pointerType as PALPointerEvent['pointerType'],
      x: ev.clientX,
      y: ev.clientY,
      button: ev.button,
      movementX: ev.movementX ?? 0,
      movementY: ev.movementY ?? 0,
    });
    const down = (ev: PointerEvent) => cb(conv(ev, 'down'));
    const move = (ev: PointerEvent) => cb(conv(ev, 'move'));
    const up = (ev: PointerEvent) => cb(conv(ev, 'up'));
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }

  onWheel(cb: (deltaY: number) => void): Fn {
    const fn = (ev: WheelEvent) => {
      ev.preventDefault();
      cb(ev.deltaY);
    };
    // passive:false 才能 preventDefault 阻止页面缩放/滚动
    window.addEventListener('wheel', fn, { passive: false });
    return () => window.removeEventListener('wheel', fn);
  }

  onTouch(cb: (e: PALTouchEvent) => void): Fn {
    const conv = (ev: TouchEvent, type: PALTouchEvent['type']) => {
      const points: PALTouchEvent['points'] = [];
      for (let i = 0; i < ev.touches.length; i++) {
        const t = ev.touches[i]!;
        points.push({ id: t.identifier, x: t.clientX, y: t.clientY });
      }
      cb({ type, points });
    };
    const s = (ev: TouchEvent) => conv(ev, 'start');
    const m = (ev: TouchEvent) => conv(ev, 'move');
    const e = (ev: TouchEvent) => conv(ev, 'end');
    this.surface.addEventListener('touchstart', s, { passive: true });
    this.surface.addEventListener('touchmove', m, { passive: true });
    this.surface.addEventListener('touchend', e, { passive: true });
    return () => {
      this.surface.removeEventListener('touchstart', s);
      this.surface.removeEventListener('touchmove', m);
      this.surface.removeEventListener('touchend', e);
    };
  }

  requestPointerLock(): void {
    void this.surface.requestPointerLock?.();
  }

  exitPointerLock(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  get isPointerLocked(): boolean {
    return document.pointerLockElement === this.surface;
  }
}
