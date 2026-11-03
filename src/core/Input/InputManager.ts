import type { EventBus } from '../events.js';
import { pal } from '../PAL/index.js';
import { DEFAULT_KEY_BINDINGS, type InputAction } from '../../data/input-bindings.js';

/**
 * 语义输入管理器:PAL 原始事件 → 语义动作(PROMPT §4.6)。
 * 用法(每帧):moveVector() / isDown(a) / consumePressed(a) / consumeLook() / consumeZoom()。
 * 帧末必须调用 endFrame() 清理边沿态(Engine.onFrameEnd 已挂)。
 */
export class InputManager {
  private readonly down = new Set<InputAction>();
  private readonly pressed = new Set<InputAction>();
  private readonly released = new Set<InputAction>();
  private lookX = 0;
  private lookY = 0;
  private zoom = 0;
  private rmbDown = false;
  private leftDown = false;
  private unsubs: (() => void)[] = [];
  /** 触屏虚拟摇杆向量(x 右 / z 前,归一化) */
  private virtualMoveX = 0;
  private virtualMoveZ = 0;

  /** 触屏控件注入:摇杆向量 */
  setVirtualMove(x: number, z: number): void {
    this.virtualMoveX = x;
    this.virtualMoveZ = z;
  }

  /** 触屏控件注入:视角拖拽增量 */
  addVirtualLook(dx: number, dy: number): void {
    this.lookX += dx;
    this.lookY += dy;
  }

  constructor(private readonly bus: EventBus) {
    this.attach();
  }

  private map(code: string): InputAction | undefined {
    return DEFAULT_KEY_BINDINGS[code];
  }

  private attach(): void {
    const { input } = pal();
    this.unsubs.push(
      input.onKeyDown((e) => {
        if (e.repeat) return;
        const action = this.map(e.code);
        if (!action) return;
        if (!this.down.has(action)) this.pressed.add(action);
        this.down.add(action);
        this.bus.emit('input:action', { action, phase: 'start' });
      }),
      input.onKeyUp((e) => {
        const action = this.map(e.code);
        if (!action) return;
        this.down.delete(action);
        this.released.add(action);
        this.bus.emit('input:action', { action, phase: 'end' });
      }),
      input.onPointer((e) => {
        if (e.pointerType === 'mouse') {
          if (e.type === 'down' && e.button === 2) this.rmbDown = true;
          if (e.type === 'up' && e.button === 2) this.rmbDown = false;
          // 左键 = 普攻(§4.6 桌面端扩展键位)
          if (e.type === 'down' && e.button === 0 && !this.leftDown) {
            this.leftDown = true;
            if (!this.down.has('attack')) this.pressed.add('attack');
            this.down.add('attack');
            this.bus.emit('input:action', { action: 'attack', phase: 'start' });
          }
          if (e.type === 'up' && e.button === 0 && this.leftDown) {
            this.leftDown = false;
            this.down.delete('attack');
            this.released.add('attack');
            this.bus.emit('input:action', { action: 'attack', phase: 'end' });
          }
        }
        // 指针锁定时始终累积视角;未锁定时按住右键拖拽
        const locked = pal().input.isPointerLocked;
        if (e.type === 'move' && (locked || this.rmbDown)) {
          this.lookX += e.movementX;
          this.lookY += e.movementY;
        }
      }),
      input.onWheel((deltaY) => {
        this.zoom += deltaY;
      }),
    );
  }

  /* ---------- 轮询 ---------- */

  isDown(action: InputAction): boolean {
    return this.down.has(action);
  }

  consumePressed(action: InputAction): boolean {
    if (this.pressed.has(action)) {
      this.pressed.delete(action);
      return true;
    }
    return false;
  }

  consumeReleased(action: InputAction): boolean {
    if (this.released.has(action)) {
      this.released.delete(action);
      return true;
    }
    return false;
  }

  /** 移动向量为相机空间:x 右 / z 前(键盘 + 虚拟摇杆合并) */
  moveVector(): { x: number; z: number } {
    const kx = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
    const kz = (this.isDown('forward') ? 1 : 0) - (this.isDown('back') ? 1 : 0);
    const x = kx + this.virtualMoveX;
    const z = kz + this.virtualMoveZ;
    const len = Math.hypot(x, z);
    return len > 1 ? { x: x / len, z: z / len } : { x, z };
  }

  consumeLook(): { dx: number; dy: number } {
    const out = { dx: this.lookX, dy: this.lookY };
    this.lookX = 0;
    this.lookY = 0;
    return out;
  }

  consumeZoom(): number {
    const z = this.zoom;
    this.zoom = 0;
    return z;
  }

  endFrame(): void {
    this.pressed.clear();
    this.released.clear();
  }

  dispose(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];
    this.down.clear();
  }
}
