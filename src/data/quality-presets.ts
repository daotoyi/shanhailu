/**
 * 画质三档预设(数据驱动,PROMPT §3.15 / §4.7)。
 * ssao 高档位占位字段,M8 实现后生效。
 */

export type QualityLevel = 'low' | 'medium' | 'high';

export interface QualityPreset {
  /** 相对设备像素比的缩放(分辨率缩放) */
  pixelRatioScale: number;
  shadows: boolean;
  shadowMapSize: number;
  bloom: boolean;
  vignette: boolean;
  ssao: boolean;
}

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  low: { pixelRatioScale: 0.75, shadows: false, shadowMapSize: 1024, bloom: false, vignette: true, ssao: false },
  medium: { pixelRatioScale: 1.0, shadows: true, shadowMapSize: 2048, bloom: true, vignette: true, ssao: false },
  high: { pixelRatioScale: 1.0, shadows: true, shadowMapSize: 4096, bloom: true, vignette: true, ssao: true },
};

export const QUALITY_ORDER: readonly QualityLevel[] = ['low', 'medium', 'high'];

export const QUALITY_LABEL: Record<QualityLevel, string> = {
  low: '低',
  medium: '中',
  high: '高',
};
