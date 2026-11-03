import type { InputManager } from '../../core/Input/InputManager.js';
import { pal } from '../../core/PAL/index.js';

/**
 * 触屏控件(PROMPT §4.6):左侧动态虚拟摇杆 + 右半屏拖拽视角。
 * DOM 实现于 ui 层(唯一 DOM 边界);触屏设备自动显示,桌面隐藏。
 * 命中区域 ≥44px;注入经 InputManager 语义接口,与键鼠完全同权。
 */

const STICK_RADIUS = 56;
const STICK_VISUAL = 52;
const KNOB_VISUAL = 24;

export class TouchControls {
  private readonly layer: HTMLDivElement;
  private readonly stickBase: HTMLDivElement;
  private readonly stickKnob: HTMLDivElement;
  private stickId: number | null = null;
  private stickOriginX = 0;
  private stickOriginY = 0;
  private lookId: number | null = null;
  private lookLastX = 0;
  private lookLastY = 0;
  private unsub: () => void;

  constructor(
    private readonly input: InputManager,
    root: { append(node: HTMLElement): void },
  ) {
    this.layer = document.createElement('div');
    this.layer.style.cssText =
      'position:absolute;inset:0;pointer-events:none;z-index:60;touch-action:none;';
    this.stickBase = this.makeCircle(STICK_VISUAL * 2, 'rgba(232,226,211,0.14)', '1px solid rgba(201,162,92,0.55)');
    this.stickKnob = this.makeCircle(KNOB_VISUAL * 2, 'rgba(201,162,92,0.55)', '1px solid rgba(232,226,211,0.7)');
    this.stickBase.style.display = 'none';
    this.stickKnob.style.display = 'none';
    this.layer.append(this.stickBase, this.stickKnob);
    root.append(this.layer);

    this.unsub = pal().input.onTouch((e) => this.onTouch(e));
    this.syncVisibility();
  }

  private makeCircle(d: number, bg: string, border: string): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;width:${d}px;height:${d}px;border-radius:50%;background:${bg};border:${border};pointer-events:none;`;
    return el;
  }

  private syncVisibility(): void {
    this.layer.style.display = pal().platform.isTouch ? 'block' : 'none';
  }

  /** 供设置面板在触屏模式切换时刷新 */
  refresh(): void {
    this.syncVisibility();
  }

  private onTouch(e: { type: 'start' | 'move' | 'end'; points: { id: number; x: number; y: number }[] }): void {
    const stage = this.layer.getBoundingClientRect();
    const toLocal = (px: number, py: number) => ({ x: px - stage.left, y: py - stage.top });
    const halfW = stage.width / 2;

    if (e.type === 'start') {
      for (const p of e.points) {
        const lp = toLocal(p.x, p.y);
        if (this.stickId === null && lp.x <= halfW) {
          // 左半屏:动态摇杆原点
          this.stickId = p.id;
          this.stickOriginX = lp.x;
          this.stickOriginY = lp.y;
          this.stickBase.style.display = 'block';
          this.stickKnob.style.display = 'block';
          this.place(this.stickBase, lp.x, lp.y);
          this.place(this.stickKnob, lp.x, lp.y);
        } else if (this.lookId === null && lp.x > halfW) {
          // 右半屏:视角拖拽
          this.lookId = p.id;
          this.lookLastX = p.x;
          this.lookLastY = p.y;
        }
      }
    } else if (e.type === 'move') {
      for (const p of e.points) {
        if (p.id === this.stickId) {
          const lp = toLocal(p.x, p.y);
          let dx = lp.x - this.stickOriginX;
          let dy = lp.y - this.stickOriginY;
          const len = Math.hypot(dx, dy);
          if (len > STICK_RADIUS) {
            dx = (dx / len) * STICK_RADIUS;
            dy = (dy / len) * STICK_RADIUS;
          }
          this.place(this.stickKnob, this.stickOriginX + dx, this.stickOriginY + dy);
          // 归一化注入:x 右 / z 前(屏幕上推 = 前)
          this.input.setVirtualMove(dx / STICK_RADIUS, -dy / STICK_RADIUS);
        } else if (p.id === this.lookId) {
          this.input.addVirtualLook(p.x - this.lookLastX, p.y - this.lookLastY);
          this.lookLastX = p.x;
          this.lookLastY = p.y;
        }
      }
    } else {
      for (const p of e.points) {
        if (p.id === this.stickId) {
          this.stickId = null;
          this.input.setVirtualMove(0, 0);
          this.stickBase.style.display = 'none';
          this.stickKnob.style.display = 'none';
        } else if (p.id === this.lookId) {
          this.lookId = null;
        }
      }
    }
  }

  private place(el: HTMLDivElement, x: number, y: number): void {
    const s = el.offsetWidth / 2;
    el.style.left = `${x - s}px`;
    el.style.top = `${y - s}px`;
  }

  dispose(): void {
    this.unsub();
    this.layer.remove();
  }
}
