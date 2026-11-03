/**
 * 类型化事件总线 —— 层间解耦的唯一事件通道。
 * 新增事件必须在此登记载荷类型,禁止 any 广播。
 */

export interface AppEventMap {
  'engine:resize': { width: number; height: number; dpr: number };
  'engine:frame': { dt: number };
  'input:action': { action: string; phase: 'start' | 'end' };
  'debug:toggleF3': Record<string, never>;
  'quality:changed': { level: string };
  'world:teleport': { mapId: string; spawnId: string; label: string };
  'world:boundary': Record<string, never>;
  'story:chapter': { chapter: string };
  'quest:accepted': { id: string; name: string };
  'quest:changed': { id: string };
  'quest:progress': { id: string; stepIndex: number; done: boolean };
  'quest:completed': { id: string; name: string; rewards: { exp?: number; coins?: number; flags?: Record<string, boolean | number> } };
}

type Handler<K extends keyof AppEventMap> = (payload: AppEventMap[K]) => void;

export class EventBus {
  private handlers = new Map<keyof AppEventMap, Set<Handler<never>>>();

  on<K extends keyof AppEventMap>(key: K, fn: Handler<K>): () => void {
    let set = this.handlers.get(key);
    if (!set) {
      set = new Set();
      this.handlers.set(key, set);
    }
    set.add(fn as Handler<never>);
    return () => this.off(key, fn);
  }

  off<K extends keyof AppEventMap>(key: K, fn: Handler<K>): void {
    this.handlers.get(key)?.delete(fn as Handler<never>);
  }

  emit<K extends keyof AppEventMap>(key: K, payload: AppEventMap[K]): void {
    const set = this.handlers.get(key);
    if (!set) return;
    for (const fn of set) (fn as Handler<K>)(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}
