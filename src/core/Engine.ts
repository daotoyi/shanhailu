import * as THREE from 'three';
import { pal } from './PAL/index.js';
import { ServiceKey, provide } from './Services.js';
import { Time } from './Time.js';
import type { EventBus } from './events.js';

export type TickFn = (dt: number, elapsed: number) => void;

/**
 * 引擎核心:渲染器、主循环、时间与尺寸事件。
 * 与具体玩法无关;场景/相机由上层(world)组装并注册 tick。
 */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly time = new Time();
  private readonly ticks: TickFn[] = [];
  private readonly frameEndCbs: (() => void)[] = [];
  private running = false;
  private unsubscribeResize?: () => void;

  constructor(canvas: HTMLCanvasElement, private readonly bus: EventBus) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    provide<Engine>(ServiceKey.Engine, this);
  }

  /** 每帧回调(渲染前的玩法/渲染更新) */
  onTick(fn: TickFn): void {
    this.ticks.push(fn);
  }

  /** 帧末回调(输入边沿清理等) */
  onFrameEnd(fn: () => void): void {
    this.frameEndCbs.push(fn);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    // 像素比由 QualityManager 统一管辖(基础 dpr × 档位缩放),引擎只负责画布尺寸
    this.unsubscribeResize = pal().platform.onResize((w, h, dpr) => {
      this.renderer.setSize(w, h, false);
      this.bus.emit('engine:resize', { width: w, height: h, dpr });
    });

    this.renderer.setAnimationLoop(() => this.frameOnce());
  }

  /** 单帧推进(rAF 被宿主节流时,自测/自动化可手动驱动) */
  frameOnce(): void {
    const now = pal().platform.now();
    this.time.update(now);
    const { dt, elapsed } = this.time;
    for (const tick of this.ticks) tick(dt, elapsed);
    this.bus.emit('engine:frame', { dt });
    for (const cb of this.frameEndCbs) cb();
  }

  stop(): void {
    this.renderer.setAnimationLoop(null);
    this.running = false;
    this.unsubscribeResize?.();
  }
}
