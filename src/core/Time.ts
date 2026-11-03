/**
 * 时间系统:帧间隔(限幅)、累计时长、帧计数与 FPS 指数滑动平均(F3 面板数据源)。
 */
export class Time {
  /** 上一帧间隔(秒),限幅 0.1s 防止切后台恢复时物理/动画爆走 */
  dt = 0;
  /** 运行累计秒数(自 start 起) */
  elapsed = 0;
  /** 帧序号 */
  frame = 0;
  /** FPS 指数滑动平均 */
  fps = 0;
  /** 未限幅的原始帧间隔(ms),调试用 */
  rawMs = 0;

  private last = -1;

  update(nowMs: number): void {
    if (this.last < 0) {
      this.last = nowMs;
      return;
    }
    this.rawMs = nowMs - this.last;
    this.last = nowMs;
    const dt = Math.min(this.rawMs / 1000, 0.1);
    this.dt = dt;
    this.elapsed += dt;
    this.frame++;
    if (dt > 0) {
      const inst = 1 / dt;
      this.fps = this.fps === 0 ? inst : this.fps * 0.95 + inst * 0.05;
    }
  }
}
