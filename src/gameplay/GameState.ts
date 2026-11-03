import type { EventBus } from '../core/events.js';

/**
 * 全局游戏状态:剧情旗标 + 章节进度(存档的核心载荷)。
 * 旗标命名约定:domain.key(如 story.prologue_done / world.shrine_unlocked)。
 */
export class GameState {
  /** 剧情旗标 */
  flags: Record<string, boolean | number | string> = {};
  /** 当前章节 id(对应 script 数据) */
  chapter = 'prologue';
  /** 累计游戏时长(秒) */
  playtimeSec = 0;

  private dirty = false;

  constructor(private readonly bus: EventBus) {}

  markDirty(): void {
    this.dirty = true;
  }

  consumeDirty(): boolean {
    const d = this.dirty;
    this.dirty = false;
    return d;
  }

  getFlag(key: string): boolean | number | string | undefined {
    return this.flags[key];
  }

  setFlag(key: string, value: boolean | number | string): void {
    if (this.flags[key] === value) return;
    this.flags[key] = value;
    this.markDirty();
  }

  setChapter(chapter: string): void {
    if (this.chapter === chapter) return;
    this.chapter = chapter;
    this.markDirty();
    this.bus.emit('story:chapter', { chapter });
  }

  /** 存档序列化(浅拷贝) */
  serialize(): Pick<GameState, 'flags' | 'chapter' | 'playtimeSec'> {
    return { flags: { ...this.flags }, chapter: this.chapter, playtimeSec: this.playtimeSec };
  }

  deserialize(data: Partial<Pick<GameState, 'flags' | 'chapter' | 'playtimeSec'>>): void {
    this.flags = { ...(data.flags ?? {}) };
    this.chapter = data.chapter ?? 'prologue';
    this.playtimeSec = data.playtimeSec ?? 0;
    this.markDirty();
  }
}
