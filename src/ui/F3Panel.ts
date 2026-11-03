import type * as THREE from 'three';
import type { EventBus } from '../core/events.js';
import type { Time } from '../core/Time.js';
import { QUALITY_LABEL, type QualityLevel } from '../data/quality-presets.js';

export interface F3DataProvider {
  renderer: THREE.WebGLRenderer;
  time: Time;
  camera: THREE.PerspectiveCamera;
  quality: () => QualityLevel;
  extra?: () => string;
}

/**
 * F3 调试面板(PROMPT §3.15 / §4.7):fps / 耗时 / draw calls / 三角面 /
 * 几何体 / 纹理 / 程序 / JS 堆 / 相机坐标 / 画质档。性能预算自检的数据源。
 */
export class F3Panel {
  private readonly node: HTMLDivElement;
  private visible = false;
  private acc = 0;
  private unsubs: (() => void)[] = [];

  constructor(
    bus: EventBus,
    private readonly data: F3DataProvider,
    private readonly root: { append(node: HTMLElement): void },
  ) {
    this.node = document.createElement('div');
    this.node.className = 'dsh-f3';
    this.node.style.display = 'none';
    this.root.append(this.node);
    this.unsubs.push(
      bus.on('input:action', ({ action, phase }) => {
        if (action === 'toggleDebug' && phase === 'start') this.toggle();
      }),
    );
  }

  toggle(): void {
    this.visible = !this.visible;
    this.node.style.display = this.visible ? 'block' : 'none';
  }

  update(dt: number): void {
    if (!this.visible) return;
    this.acc += dt;
    if (this.acc < 0.25) return;
    this.acc = 0;

    const info = this.data.renderer.info;
    const mem = (performance as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } })
      .memory;
    const p = this.data.camera.position;
    const lines = [
      `<b>大荒山海录 · F3 调试</b>`,
      `FPS      ${this.data.time.fps.toFixed(0).padStart(4)}   (帧 ${this.data.time.rawMs.toFixed(1)}ms)`,
      `DrawCall ${String(info.render.calls).padStart(4)}   三角 ${(info.render.triangles / 1000).toFixed(1)}k`,
      `几何体   ${info.memory.geometries}   纹理 ${info.memory.textures}   程序 ${info.programs?.length ?? 0}`,
      `JS堆     ${mem ? `${(mem.usedJSHeapSize / 1048576).toFixed(1)}MB` : 'n/a'}`,
      `坐标     ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`,
      `画质     ${QUALITY_LABEL[this.data.quality()]}`,
      this.data.extra?.() ?? '',
    ];
    this.node.innerHTML = lines.join('\n');
  }

  dispose(): void {
    for (const u of this.unsubs) u();
    this.node.remove();
  }
}
