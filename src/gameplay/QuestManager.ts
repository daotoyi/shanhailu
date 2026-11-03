import type { EventBus } from '../core/events.js';
import { QUESTS, type QuestDef } from '../data/quests.js';
import type { GameState } from './GameState.js';

export interface ActiveQuest {
  id: string;
  stepIndex: number;
  /** 各步骤计数(collect/kill 类) */
  counts: Record<string, number>;
}

/**
 * 任务系统(PROMPT §3.3):主线/支线;目标类型 talk/collect/reach/kill/interact。
 * 进度事件驱动:剧情层发 'quest:talk'/'quest:reach'/'quest:collect' 等,
 * HUD 追踪当前主线,日志面板展示全部。
 */
export class QuestManager {
  private active = new Map<string, ActiveQuest>();
  private completed = new Set<string>();
  /** 主线追踪优先级:最早接取的 main 任务 */
  private mainOrder: string[] = [];

  constructor(
    private readonly bus: EventBus,
    private readonly state: GameState,
  ) {}

  /* ---------- 查询 ---------- */

  isActive(id: string): boolean {
    return this.active.has(id);
  }

  isCompleted(id: string): boolean {
    return this.completed.has(id);
  }

  getActiveList(): ActiveQuest[] {
    return [...this.active.values()];
  }

  getActiveQuest(id: string): ActiveQuest | undefined {
    return this.active.get(id);
  }

  def(id: string): QuestDef | undefined {
    return QUESTS[id];
  }

  /** HUD 追踪:当前主线(最早未完成的) */
  getTracked(): { quest: ActiveQuest; def: QuestDef } | null {
    for (const id of this.mainOrder) {
      const a = this.active.get(id);
      const d = QUESTS[id];
      if (a && d) return { quest: a, def: d };
    }
    return null;
  }

  /* ---------- 接取/推进 ---------- */

  accept(id: string): boolean {
    if (this.active.has(id) || this.completed.has(id)) return false;
    const def = QUESTS[id];
    if (!def) return false;
    if (def.prereq?.some((p) => !this.completed.has(p))) return false;
    const a: ActiveQuest = { id, stepIndex: 0, counts: {} };
    this.active.set(id, a);
    if (def.type === 'main') this.mainOrder.push(id);
    this.bus.emit('quest:accepted', { id, name: def.name });
    this.bus.emit('quest:changed', { id });
    return true;
  }

  /** 事件推进:所有 active 任务中匹配 type+target 的步骤 +1 */
  progress(type: string, target: string, amount = 1): void {
    for (const a of [...this.active.values()]) {
      const def = QUESTS[a.id]!;
      const step = def.steps[a.stepIndex];
      if (!step || step.type !== type || step.target !== target) continue;
      const need = step.count ?? 1;
      const key = `${a.stepIndex}`;
      const now = (a.counts[key] ?? 0) + amount;
      a.counts[key] = Math.min(now, need);
      this.state.markDirty();
      this.bus.emit('quest:progress', { id: a.id, stepIndex: a.stepIndex, done: now >= need });
      if (now >= need) this.advanceStep(a.id);
    }
  }

  /** 显式跳步(剧情强制) */
  forceAdvance(id: string): void {
    this.advanceStep(id);
  }

  private advanceStep(id: string): void {
    const a = this.active.get(id);
    if (!a) return;
    const def = QUESTS[id]!;
    const step = def.steps[a.stepIndex];
    if (step?.setFlag) this.state.setFlag(step.setFlag, true);
    a.stepIndex++;
    a.counts[`${a.stepIndex - 1}`] = def.steps[a.stepIndex - 1]?.count ?? 1;
    if (a.stepIndex >= def.steps.length) {
      this.complete(id);
    } else {
      this.bus.emit('quest:changed', { id });
    }
  }

  private complete(id: string): void {
    const def = QUESTS[id]!;
    this.active.delete(id);
    this.completed.add(id);
    this.mainOrder = this.mainOrder.filter((x) => x !== id);
    if (def.rewards.flags) {
      for (const [k, v] of Object.entries(def.rewards.flags)) this.state.setFlag(k, v);
    }
    this.state.markDirty();
    this.bus.emit('quest:completed', { id, name: def.name, rewards: def.rewards });
  }

  /* ---------- 序列化 ---------- */

  serialize(): SaveAdapter {
    return {
      active: [...this.active.values()].map((a) => ({ id: a.id, stepIndex: a.stepIndex, counts: { ...a.counts } })),
      completed: [...this.completed],
    };
  }

  deserialize(data: SaveAdapter): void {
    this.active.clear();
    this.completed.clear();
    this.mainOrder = [];
    for (const a of data.active ?? []) {
      this.active.set(a.id, { id: a.id, stepIndex: a.stepIndex, counts: { ...a.counts } });
      if (QUESTS[a.id]?.type === 'main') this.mainOrder.push(a.id);
    }
    for (const id of data.completed ?? []) this.completed.add(id);
    this.bus.emit('quest:changed', { id: '*' });
  }
}

interface SaveAdapter {
  active: { id: string; stepIndex: number; counts: Record<string, number> }[];
  completed: string[];
}
