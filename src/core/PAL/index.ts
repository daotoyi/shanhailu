import { createWebPAL } from './web/index.js';
import type { PALBundle, PlatformId } from './types.js';

let bundle: PALBundle | null = null;

function detectPlatform(): PlatformId {
  const g = globalThis as Record<string, unknown>;
  const wx = g['wx'] as { getSystemInfoSync?: unknown; getSystemInfo?: unknown } | undefined;
  if (wx && (typeof wx.getSystemInfoSync === 'function' || typeof wx.getSystemInfo === 'function')) {
    return 'wechat-minigame';
  }
  return 'web';
}

/**
 * 初始化 PAL(M0:仅 Web 默认实现;微信小游戏实现属 M9 POC,接口已冻结)。
 * 重复初始化返回同一实例。
 */
export function initPAL(): PALBundle {
  if (bundle) return bundle;
  const id = detectPlatform();
  if (id !== 'web') {
    throw new Error(
      `[PAL] 检测到平台 ${id},其 PAL 实现按计划于 M9(跨平台 POC)接入;` +
        `当前仅交付 Web 实现。游戏逻辑无需改动,仅需新增 core/PAL/${id}/ 实现包。`,
    );
  }
  bundle = createWebPAL();
  return bundle;
}

/** 获取 PAL(必须先 initPAL) */
export function pal(): PALBundle {
  if (!bundle) throw new Error('[PAL] 尚未初始化,请先调用 initPAL()');
  return bundle;
}

/** 仅供测试/热更重置 */
export function resetPAL(): void {
  bundle = null;
}
