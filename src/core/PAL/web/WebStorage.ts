import type { IPALStorage } from '../types.js';

/**
 * Web 存储实现:localStorage;隐私模式/不可用时静默降级为内存 Map(游戏仍可玩,存档不持久)。
 */
export class WebStorage implements IPALStorage {
  private readonly mem = new Map<string, string>();
  private readonly ls: Storage | null;

  constructor() {
    this.ls = this.probe();
  }

  private probe(): Storage | null {
    try {
      const ls = window.localStorage;
      const k = '__pal_probe__';
      ls.setItem(k, '1');
      ls.removeItem(k);
      return ls;
    } catch {
      return null;
    }
  }

  get(key: string): string | null {
    return this.ls ? this.ls.getItem(key) : (this.mem.get(key) ?? null);
  }

  set(key: string, value: string): void {
    if (this.ls) this.ls.setItem(key, value);
    else this.mem.set(key, value);
  }

  remove(key: string): void {
    if (this.ls) this.ls.removeItem(key);
    else this.mem.delete(key);
  }

  keys(): string[] {
    if (this.ls) {
      const out: string[] = [];
      for (let i = 0; i < this.ls.length; i++) {
        const k = this.ls.key(i);
        if (k !== null) out.push(k);
      }
      return out;
    }
    return [...this.mem.keys()];
  }
}
