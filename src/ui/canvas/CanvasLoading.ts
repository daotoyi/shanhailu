import type { LoadingScreenLike } from './types.js';

/**
 * Canvas UI 后端 POC(M9,PROMPT §4.5:同一接口的 canvas 实现,验证 ui/ 与渲染后端无关)。
 * 与 DOM 版 LoadingScreen 同接口(setProgress/setReady/showError/close),
 * 以 2D canvas 自绘国风加载页(墨底/鎏金框/进度条/按钮),含点击命中。
 * 运行方式:URL 加 ?ui=canvas。
 */
export class CanvasLoading implements LoadingScreenLike {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private progress = 0;
  private statusText = '正在唤醒大荒……';
  private errorText: string | null = null;
  private ready = false;
  private closed = false;
  private enterCb: (() => void) | null = null;
  private enterHover = false;
  private raf = 0;

  constructor(stage: { append(node: HTMLElement): void }) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280;
    this.canvas.height = 720;
    this.canvas.style.cssText = 'position:absolute;inset:0;z-index:130;pointer-events:auto;';
    stage.append(this.canvas);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('[CanvasUI] 2d 上下文不可用');
    this.ctx = ctx;
    this.canvas.addEventListener('click', (e) => this.onClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMove(e));
    const loop = () => {
      if (this.closed) return;
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }

  private buttonRect(): { x: number; y: number; w: number; h: number } {
    return { x: 640 - 110, y: 520, w: 220, h: 56 };
  }

  private localXY(e: MouseEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 1280, y: ((e.clientY - r.top) / r.height) * 720 };
  }

  private onClick(e: MouseEvent): void {
    if (!this.ready) return;
    const { x, y } = this.localXY(e);
    const b = this.buttonRect();
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      this.enterCb?.();
    }
  }

  private onMove(e: MouseEvent): void {
    const { x, y } = this.localXY(e);
    const b = this.buttonRect();
    this.enterHover = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    this.canvas.style.cursor = this.enterHover && this.ready ? 'pointer' : 'default';
  }

  setProgress(ratio: number, text?: string): void {
    this.progress = Math.max(0, Math.min(1, ratio));
    if (text !== undefined) this.statusText = text;
  }

  setReady(onEnter: () => void): void {
    this.progress = 1;
    this.statusText = '大荒已就绪';
    this.ready = true;
    this.enterCb = onEnter;
  }

  showError(message: string): void {
    this.errorText = message;
  }

  close(): void {
    this.closed = true;
    cancelAnimationFrame(this.raf);
    this.canvas.remove();
  }

  /* ---------- 2D 自绘(国风 token 与 theme.css 同源) ---------- */

  private draw(): void {
    const ctx = this.ctx;
    const W = 1280;
    const H = 720;
    // 墨底
    ctx.fillStyle = '#17130e';
    ctx.fillRect(0, 0, W, H);
    const grad = ctx.createRadialGradient(640, 620, 80, 640, 620, 700);
    grad.addColorStop(0, 'rgba(43,32,24,0.9)');
    grad.addColorStop(1, 'rgba(43,32,24,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 鎏金框
    ctx.strokeStyle = 'rgba(201,162,92,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(430, 180, 420, 380);
    ctx.strokeRect(438, 188, 404, 364);

    // 标题
    ctx.fillStyle = '#e8e2d3';
    ctx.textAlign = 'center';
    ctx.font = '600 56px "DashanWenKai", "Kaiti SC", serif';
    ctx.shadowColor = 'rgba(201,162,92,0.4)';
    ctx.shadowBlur = 18;
    ctx.fillText('大 荒 山 海 录', 640, 280);
    ctx.shadowBlur = 0;
    ctx.font = '15px "DashanWenKai", serif';
    ctx.fillStyle = '#3f6f5f';
    ctx.fillText('山 经 · 海 典 · 蛮 荒 志', 640, 318);

    // 分隔
    ctx.strokeStyle = 'rgba(201,162,92,0.7)';
    ctx.beginPath();
    ctx.moveTo(500, 344);
    ctx.lineTo(780, 344);
    ctx.stroke();
    ctx.fillStyle = '#b03a2e';
    ctx.beginPath();
    ctx.arc(640, 344, 3, 0, Math.PI * 2);
    ctx.fill();

    // 进度条
    ctx.strokeStyle = 'rgba(201,162,92,0.45)';
    ctx.strokeRect(479, 380, 322, 12);
    const bg = ctx.createLinearGradient(480, 0, 800, 0);
    bg.addColorStop(0, '#3f6f5f');
    bg.addColorStop(1, '#c9a25c');
    ctx.fillStyle = bg;
    ctx.fillRect(481, 382, 318 * this.progress, 8);

    // 状态/错误
    ctx.font = '13px "DashanWenKai", serif';
    ctx.fillStyle = this.errorText ? '#b03a2e' : 'rgba(232,226,211,0.55)';
    ctx.fillText(this.errorText ?? this.statusText, 640, 424);

    // 入荒按钮
    if (this.ready) {
      const b = this.buttonRect();
      ctx.fillStyle = this.enterHover ? 'rgba(63,111,95,0.65)' : 'rgba(63,111,95,0.35)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#c9a25c';
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = this.enterHover ? '#ffffff' : '#e8e2d3';
      ctx.font = '22px "DashanWenKai", serif';
      ctx.fillText('入  荒', 640, b.y + 38);
    }
  }
}
