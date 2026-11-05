import * as THREE from 'three';
import type { EventBus } from '../core/events.js';
import { QUALITY_ORDER, QUALITY_PRESETS, type QualityLevel } from '../data/quality-presets.js';
import type { PostFX } from './PostFX.js';

export interface QualityTargets {
  renderer: THREE.WebGLRenderer;
  postfx: PostFX;
  /** 需要跟随开关阴影的主光(方向光) */
  sunLight: THREE.DirectionalLight;
}

/**
 * 画质三档管理器(数据驱动)。切换即时生效:
 * 分辨率缩放 / 阴影开关与尺寸 / Bloom / 暗角。SSAO 高档位 M8 接入。
 */
export class QualityManager {
  private level: QualityLevel = 'medium';
  private targets: QualityTargets | null = null;
  private baseDpr = 1;
  private unsubscribe?: () => void;

  constructor(private readonly bus: EventBus) {}

  bind(targets: QualityTargets): void {
    this.targets = targets;
    this.unsubscribe = this.bus.on('engine:resize', ({ dpr }) => {
      this.baseDpr = dpr;
      this.apply();
    });
    this.apply();
  }

  get current(): QualityLevel {
    return this.level;
  }

  set(level: QualityLevel): void {
    if (level === this.level) return;
    this.level = level;
    this.apply();
    this.bus.emit('quality:changed', { level });
  }

  cycle(): void {
    const idx = QUALITY_ORDER.indexOf(this.level);
    const next = QUALITY_ORDER[(idx + 1) % QUALITY_ORDER.length]!;
    this.set(next);
  }

  private apply(): void {
    const t = this.targets;
    if (!t) return;
    const preset = QUALITY_PRESETS[this.level];

    t.renderer.setPixelRatio(Math.max(0.5, this.baseDpr * preset.pixelRatioScale));
    t.renderer.shadowMap.enabled = preset.shadows;
    const sun = t.sunLight;
    sun.castShadow = preset.shadows;
    if (sun.shadow.mapSize.x !== preset.shadowMapSize) {
      sun.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
    t.postfx.setBloomEnabled(preset.bloom);
    t.postfx.setVignetteEnabled(preset.vignette);
    // setPixelRatio 已变更,composer 必须同步其缓存的 _pixelRatio
    // (实测低画质走 composer 比直出更省 draw calls,且保留暗角/色调统一,故不做直出)
    t.postfx.syncPixelRatio();
  }
}
