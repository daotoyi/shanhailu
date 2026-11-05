import type { InputManager } from '../../core/Input/InputManager.js';
import { pal } from '../../core/PAL/index.js';

/**
 * 虚拟摇杆与视角拖拽(M9+ 升级):桌面端常驻!
 * 背景:嵌入式浏览器键盘通路不可靠(CDP 实测键盘事件不达页面),
 * 因此桌面也显示左下固定摇杆(鼠标拖动 = 移动),保证 100% 可操作。
 * 触屏:左半屏动态摇杆 + 右半屏拖拽视角(原行为)。
 * 桌面:固定摇杆(左下)+ 右键拖拽视角(键盘可用时照常)。
 */

const STICK_RADIUS = 52;
const STICK_HOME = { x: 120, y: 600 }; // 舞台虚拟坐标(1280×720)

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
  /** 桌面固定摇杆区域(虚拟坐标) */
  private readonly homeRect = {
    x: STICK_HOME.x - STICK_RADIUS - 14,
    y: STICK_HOME.y - STICK_RADIUS - 14,
    w: (STICK_RADIUS + 14) * 2,
    h: (STICK_RADIUS + 14) * 2,
  };

  constructor(
    private readonly input: InputManager,
    root: { append(node: HTMLElement): void },
  ) {
    this.layer = document.createElement('div');
    this.layer.style.cssText =
      'position:absolute;inset:0;pointer-events:none;z-index:60;touch-action:none;';
    this.stickBase = this.makeCircle(STICK_RADIUS * 2, 'rgba(232,226,211,0.12)', '1px solid rgba(201,162,92,0.5)');
    this.stickKnob = this.makeCircle(44, 'rgba(201,162,92,0.6)', '1px solid rgba(232,226,211,0.75)');
    // 固定摇杆:常驻显示于左下
    this.stickBase.style.display = 'block';
    this.place(this.stickBase, STICK_HOME.x, STICK_HOME.y);
    this.stickKnob.style.display = 'block';
    this.place(this.stickKnob, STICK_HOME.x, STICK_HOME.y);
    const tip = document.createElement('div');
    tip.textContent = '拖动移动';
    tip.style.cssText =
      'position:absolute;font-size:11px;color:rgba(232,226,211,0.55);letter-spacing:2px;transform:translateX(-50%);';
    this.place(tip, STICK_HOME.x, STICK_HOME.y + STICK_RADIUS + 24);
    this.layer.append(this.stickBase, this.stickKnob, tip);
    root.append(this.layer);

    this.unsub = pal().input.onPointer((e) => this.onPointer(e));
  }

  private makeCircle(d: number, bg: string, border: string): HTMLDivElement {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;width:${d}px;height:${d}px;border-radius:50%;background:${bg};border:${border};pointer-events:none;box-sizing:border-box;`;
    return el;
  }

  private toVirtual(e: { x: number; y: number }): { x: number; y: number } {
    const stage = this.layer.getBoundingClientRect();
    const scale = stage.width / 1280 || 1;
    return { x: (e.x - stage.left) / scale, y: (e.y - stage.top) / scale };
  }

  private onPointer(e: { type: 'down' | 'move' | 'up'; pointerId: number; pointerType: string; x: number; y: number }): void {
    const v = this.toVirtual(e);
    if (e.type === 'down') {
      const inHome =
        v.x >= this.homeRect.x && v.x <= this.homeRect.x + this.homeRect.w &&
        v.y >= this.homeRect.y && v.y <= this.homeRect.y + this.homeRect.h;
      const isTouch = e.pointerType !== 'mouse';
      if (this.stickId === null && (inHome || (isTouch && v.x <= 640))) {
        // 摇杆:桌面=固定区按下;触屏=左半屏动态原点
        this.stickId = e.pointerId;
        this.stickOriginX = inHome ? STICK_HOME.x : v.x;
        this.stickOriginY = inHome ? STICK_HOME.y : v.y;
        if (!inHome) {
          this.stickBase.style.display = 'block';
          this.place(this.stickBase, v.x, v.y);
          this.place(this.stickKnob, v.x, v.y);
        }
      } else if (this.lookId === null && isTouch && v.x > 640) {
        this.lookId = e.pointerId;
        this.lookLastX = e.x;
        this.lookLastY = e.y;
      }
    } else if (e.type === 'move') {
      if (e.pointerId === this.stickId) {
        let dx = v.x - this.stickOriginX;
        let dy = v.y - this.stickOriginY;
        const len = Math.hypot(dx, dy);
        if (len > STICK_RADIUS) {
          dx = (dx / len) * STICK_RADIUS;
          dy = (dy / len) * STICK_RADIUS;
        }
        this.place(this.stickKnob, this.stickOriginX + dx, this.stickOriginY + dy);
        this.input.setVirtualMove(dx / STICK_RADIUS, -dy / STICK_RADIUS);
      } else if (e.pointerId === this.lookId) {
        this.input.addVirtualLook(e.x - this.lookLastX, e.y - this.lookLastY);
        this.lookLastX = e.x;
        this.lookLastY = e.y;
      }
    } else {
      if (e.pointerId === this.stickId) {
        this.stickId = null;
        this.input.setVirtualMove(0, 0);
        // 桌面:摇杆回位常驻;触屏:动态盘隐藏
        this.place(this.stickBase, STICK_HOME.x, STICK_HOME.y);
        this.place(this.stickKnob, STICK_HOME.x, STICK_HOME.y);
      } else if (e.pointerId === this.lookId) {
        this.lookId = null;
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
