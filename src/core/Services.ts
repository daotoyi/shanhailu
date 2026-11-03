/**
 * 轻量服务定位器 —— 跨层获取单例服务的唯一入口。
 * 注册键集中登记,取用方泛型断言,避免字符串散落。
 */

const registry = new Map<string, unknown>();

export const ServiceKey = {
  Bus: 'bus',
  Engine: 'engine',
  Input: 'input',
  Quality: 'quality',
  UIRoot: 'uiRoot',
} as const;

export type ServiceKey = (typeof ServiceKey)[keyof typeof ServiceKey];

export function provide<T>(key: ServiceKey, service: T): void {
  if (registry.has(key)) {
    throw new Error(`[Services] 重复注册: ${key}`);
  }
  registry.set(key, service);
}

export function inject<T>(key: ServiceKey): T {
  const svc = registry.get(key);
  if (svc === undefined) {
    throw new Error(`[Services] 服务未注册: ${key}`);
  }
  return svc as T;
}

export function resetServices(): void {
  registry.clear();
}
