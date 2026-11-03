import type { BuiltMap } from '../world/maps/types.js';

/**
 * 小地图(PROMPT §3.4):圆形罗盘式,右上角。
 * 底图 = 地图构建期烘焙的 RGBA 像素;箭头 = 玩家朝向;金点 = 传送阵。
 * canvas 绘制全部发生在 ui 层(唯一 DOM 边界)。
 */

const SIZE = 148;

export class Minimap {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly base: HTMLCanvasElement;
  private baseCtx: CanvasRenderingContext2D | null = null;
  private map: BuiltMap | null = null;
  private acc = 0;

  constructor(stage: { append(node: HTMLElement): void }) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = SIZE;
    this.canvas.height = SIZE;
    this.canvas.style.cssText = [
      'position:absolute', `right:14px`, `top:12px`,
      `width:${SIZE}px`, `height:${SIZE}px`, 'z-index:50', 'pointer-events:none',
    ].join(';');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('[UI] 小地图 canvas 2d 上下文不可用');
    this.ctx = ctx;
    this.base = document.createElement('canvas');
    stage.append(this.canvas);
  }

  /** 切图时更新底图 */
  setMap(map: BuiltMap): void {
    this.map = map;
    this.base.width = map.minimap.size;
    this.base.height = map.minimap.size;
    this.baseCtx = this.base.getContext('2d');
    if (!this.baseCtx) return;
    const img = this.baseCtx.createImageData(map.minimap.size, map.minimap.size);
    img.data.set(map.minimap.pixels);
    this.baseCtx.putImageData(img, 0, 0);
  }

  /** 每帧调用(内部 15Hz 节流重绘) */
  update(dt: number, playerPos: { x: number; z: number }, heading: number, elapsed: number): void {
    this.acc += dt;
    if (this.acc < 1 / 15) return;
    this.acc = 0;
    const ctx = this.ctx;
    const map = this.map;
    if (!map || !this.baseCtx) return;

    const R = SIZE / 2;
    const viewR = R - 4;
    const scale = viewR / map.minimap.worldRadius;

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    // 圆形裁剪
    ctx.beginPath();
    ctx.arc(R, R, viewR, 0, Math.PI * 2);
    ctx.clip();
    // 底图映射:世界 → 以玩家为中心
    const drawSize = map.minimap.worldRadius * 2 * scale;
    const dx = R - (playerPos.x + map.minimap.worldRadius) * scale;
    const dy = R - (playerPos.z + map.minimap.worldRadius) * scale;
    ctx.drawImage(this.base, dx, dy, drawSize, drawSize);
    // 传送点(金圈脉动)
    const pulse = 2.2 + Math.sin(elapsed * 3) * 0.7;
    for (const t of map.teleporters) {
      const tx = R + (t.pos.x - playerPos.x) * scale;
      const ty = R + (t.pos.y - playerPos.z) * scale;
      ctx.beginPath();
      ctx.arc(tx, ty, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(201,162,92,0.95)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tx, ty, 3.4 + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(201,162,92,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // 玩家箭头
    ctx.translate(R, R);
    ctx.rotate(-heading + Math.PI);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(4.6, 5.5);
    ctx.lineTo(0, 3);
    ctx.lineTo(-4.6, 5.5);
    ctx.closePath();
    ctx.fillStyle = '#e8e2d3';
    ctx.strokeStyle = '#17130e';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 罗盘框:外环 + 方位刻度
    ctx.save();
    ctx.beginPath();
    ctx.arc(R, R, viewR, 0, Math.PI * 2);
    ctx.strokeStyle = '#c9a25c';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(R, R, viewR - 3.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(201,162,92,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 北(N)标记
    ctx.fillStyle = '#b03a2e';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('北', R, 11);
    ctx.restore();
  }
}
