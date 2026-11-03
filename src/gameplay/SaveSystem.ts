import { pal } from '../core/PAL/index.js';
import type { GameState } from './GameState.js';
import type { QuestManager } from './QuestManager.js';

const SAVE_PREFIX = 'dashan_save_';
const SETTINGS_KEY = 'dashan_settings';
const SAVE_VERSION = 2;
export const SAVE_SLOT_COUNT = 3;

export interface PlayerSaveBlob {
  pos: [number, number, number];
  heading: number;
}

export interface SaveData {
  version: number;
  savedAt: number;
  playtimeSec: number;
  chapter: string;
  flags: Record<string, boolean | number | string>;
  quests: {
    active: { id: string; stepIndex: number; counts: Record<string, number> }[];
    completed: string[];
  };
  player: PlayerSaveBlob;
  mapId: string;
  /** v2:成长与物品(结构宽松:反序列化侧各自校验) */
  bag?: { slots: ( { itemId: string; count: number; enhance?: number } | null)[]; coins: number };
  equip?: { slots: Record<string, { itemId: string; enhance: number } | null>; alchemyLevel: number; alchemyExp: number };
  prog?: { level: number; exp: number; realmIndex: number };
}

export interface SaveMeta {
  slot: number;
  savedAt: number;
  chapter: string;
  playtimeSec: number;
}

function migrate(raw: unknown): SaveData {
  const d = raw as SaveData;
  // 迁移链:v1(纯剧情档)→ v2(补成长/物品空壳)
  if (d.version === 1) {
    d.version = 2;
    d.bag = { slots: Array(24).fill(null), coins: 0 };
    d.equip = { slots: {}, alchemyLevel: 0, alchemyExp: 0 };
    d.prog = { level: 1, exp: 0, realmIndex: 0 };
  }
  if (d.version === SAVE_VERSION) return d;
  throw new Error(`[Save] 未知存档版本 ${d.version}`);
}

/**
 * 存档系统(PROMPT §3.13):PAL.Storage 之上的版本化/多存档位/导入导出。
 * 全量状态由 GameState + QuestManager + 玩家位姿构成;自动存档写 slot 0。
 */
export class SaveSystem {
  constructor(
    private readonly state: GameState,
    private readonly quests: QuestManager,
  ) {}

  save(slot: number, player: PlayerSaveBlob, mapId: string, extra?: Partial<Pick<SaveData, 'bag' | 'equip' | 'prog'>>): void {
    const data: SaveData = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      playtimeSec: Math.floor(this.state.playtimeSec),
      chapter: this.state.chapter,
      flags: { ...this.state.flags },
      quests: this.quests.serialize(),
      player,
      mapId,
      ...extra,
    };
    pal().storage.set(`${SAVE_PREFIX}${slot}`, JSON.stringify(data));
    this.state.markDirty();
  }

  load(slot: number): SaveData | null {
    const raw = pal().storage.get(`${SAVE_PREFIX}${slot}`);
    if (!raw) return null;
    try {
      return migrate(JSON.parse(raw));
    } catch (e) {
      console.error('[Save] 存档损坏', e);
      return null;
    }
  }

  list(): (SaveMeta | null)[] {
    const out: (SaveMeta | null)[] = [];
    for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
      const d = this.load(i);
      out.push(d ? { slot: i, savedAt: d.savedAt, chapter: d.chapter, playtimeSec: d.playtimeSec } : null);
    }
    return out;
  }

  /** base64 存档码(导出/导入,跨设备迁移用) */
  exportCode(slot: number): string | null {
    const raw = pal().storage.get(`${SAVE_PREFIX}${slot}`);
    if (!raw) return null;
    try {
      return btoa(encodeURIComponent(raw));
    } catch {
      return null;
    }
  }

  importCode(code: string, slot: number): boolean {
    try {
      const raw = decodeURIComponent(atob(code.trim()));
      migrate(JSON.parse(raw)); // 校验
      pal().storage.set(`${SAVE_PREFIX}${slot}`, raw);
      return true;
    } catch {
      return false;
    }
  }

  /* ---- 设置(音量/灵敏度/画质等,M8 扩展) ---- */

  getSettings(): Record<string, number | string | boolean> {
    const raw = pal().storage.get(SETTINGS_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, number | string | boolean>;
    } catch {
      return {};
    }
  }

  setSetting(key: string, value: number | string | boolean): void {
    const s = this.getSettings();
    s[key] = value;
    pal().storage.set(SETTINGS_KEY, JSON.stringify(s));
  }
}
