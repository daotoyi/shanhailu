import { QUESTS } from '../data/quests.js';

export interface NarrativeItem {
  story: string;
  op?: string;
  dur?: number;
}

/**
 * 剧情同步条(M9+ 反馈):底部居中一行旁白 + 一行当前操作提示。
 * 任务接取/推进/完成与章节切换时自动更新;字体与过场字幕一致(用户点名好评的那款)。
 */
export class NarrativeBar {
  private readonly root: HTMLDivElement;
  private readonly storyEl: HTMLDivElement;
  private readonly opEl: HTMLDivElement;
  private queue: NarrativeItem[] = [];
  private showing = false;

  constructor(stage: { append(...nodes: HTMLElement[]): void }) {
    this.root = document.createElement('div');
    this.root.style.cssText = [
      'position:absolute', 'left:50%', 'bottom:26px', 'transform:translateX(-50%)',
      'display:flex', 'flex-direction:column', 'align-items:center', 'gap:4px',
      'pointer-events:none', 'z-index:85', 'opacity:0', 'transition:opacity 0.5s ease',
      'max-width:980px',
    ].join(';');
    this.storyEl = document.createElement('div');
    this.storyEl.style.cssText =
      'font-size:17px;letter-spacing:3px;color:#e8e2d3;text-shadow:0 1px 3px #000,0 0 10px rgba(0,0,0,0.8);text-align:center;white-space:nowrap;';
    this.opEl = document.createElement('div');
    this.opEl.style.cssText =
      'font-size:13px;letter-spacing:2px;color:#ffd45e;text-shadow:0 1px 3px #000;text-align:center;';
    this.root.append(this.storyEl, this.opEl);
    stage.append(this.root);
  }

  /** 推入一条(队列串行播放) */
  push(item: NarrativeItem): void {
    this.queue.push(item);
    if (!this.showing) this.next();
  }

  private next(): void {
    const item = this.queue.shift();
    if (!item) {
      this.showing = false;
      this.root.style.opacity = '0';
      return;
    }
    this.showing = true;
    this.storyEl.textContent = item.story;
    this.opEl.textContent = item.op ?? '';
    this.opEl.style.display = item.op ? 'block' : 'none';
    this.root.style.opacity = '1';
    window.setTimeout(() => {
      this.root.style.opacity = '0';
      window.setTimeout(() => this.next(), 520);
    }, item.dur ?? 4200);
  }

  /* ---------- 剧情钩子(由 main 桥接) ---------- */

  onQuestAccepted(id: string): void {
    const def = QUESTS[id];
    if (!def) return;
    const first = def.steps[0];
    const op = first ? this.opOf(first.type) : undefined;
    this.push({ story: `「${def.name}」${def.summary}`, op, dur: 5200 });
  }

  onQuestCompleted(id: string): void {
    const def = QUESTS[id];
    if (!def) return;
    this.push({ story: `${def.name} · 了结`, op: '留意右上角任务指引,前往下一目标', dur: 4600 });
  }

  onChapter(chapterName: string, epigraph: string): void {
    this.push({ story: `${chapterName} —— ${epigraph}`, op: '跟随右上角指引继续旅程', dur: 5200 });
  }

  private opOf(type: string): string | undefined {
    const map: Record<string, string> = {
      collect: '操作:靠近发光草药按 E',
      talk: '操作:走近 NPC 按 E',
      reach: '操作:前往金色光柱处',
      kill: '操作:前往目标区域击败怪物',
      interact: '操作:靠近目标按 E',
      escort: '操作:跟随护送目标',
      timer: '操作:在时限内完成',
    };
    return map[type];
  }
}
