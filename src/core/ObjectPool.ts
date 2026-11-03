/**
 * 通用对象池(PROMPT §4.7:粒子/飘字/弹道/掉落物必须有池)。
 * acquire 复用闲置对象或经 factory 新建;release 时经 reset 清理状态。
 */
export class ObjectPool<T> {
  private free: T[] = [];
  private readonly live = new Set<T>();

  constructor(
    private readonly factory: () => T,
    private readonly reset: (item: T) => void,
    prewarm = 0,
  ) {
    for (let i = 0; i < prewarm; i++) this.free.push(factory());
  }

  acquire(): T {
    const item = this.free.pop() ?? this.factory();
    this.live.add(item);
    return item;
  }

  release(item: T): void {
    if (!this.live.delete(item)) return;
    this.reset(item);
    this.free.push(item);
  }

  get liveCount(): number {
    return this.live.size;
  }

  get freeCount(): number {
    return this.free.length;
  }

  /** 释放全部在用对象(场景卸载时) */
  releaseAll(): void {
    for (const item of [...this.live]) this.release(item);
  }
}
