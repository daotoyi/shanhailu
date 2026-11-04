import type { QuestManager } from '../gameplay/QuestManager.js';
import type { EventBus } from '../core/events.js';

/** 每类目标的操作指引(让玩家知道"怎么操作") */
const STEP_HINTS: Record<string, string> = {
  collect: '靠近发光的草药,按 E 采集',
  talk: '走近 NPC,按 E 对话',
  reach: '朝金色光柱(信标)走过去',
  kill: '前往目标区域,击败目标怪物',
  interact: '靠近目标,按 E 交互',
  escort: '紧随护送对象',
  timer: '在时限内完成目标',
};

/**
 * HUD 任务追踪(右上,小地图下方):当前主线步骤 + 进度 + 操作指引;任务完成横幅提示。
 */
export class QuestTracker {
  private readonly root: HTMLDivElement;
  private readonly title: HTMLDivElement;
  private readonly step: HTMLDivElement;
  private readonly banner: HTMLDivElement;
  private bannerTimer = 0;

  constructor(
    stage: { append(...nodes: HTMLElement[]): void },
    private readonly quests: QuestManager,
    bus: EventBus,
  ) {
    this.root = document.createElement('div');
    this.root.style.cssText = [
      'position:absolute', 'right:14px', `top:${12 + 148 + 10}px`, 'width:240px',
      'z-index:50', 'pointer-events:none', 'display:none',
    ].join(';');
    this.title = document.createElement('div');
    this.title.className = 'dsh-label gold';
    this.title.style.cssText = 'font-size:14px;letter-spacing:3px;margin-bottom:4px;text-shadow:0 1px 2px #000;';
    this.step = document.createElement('div');
    this.step.className = 'dsh-label';
    this.step.style.cssText = 'font-size:12px;line-height:1.6;color:#e8e2d3;text-shadow:0 1px 2px #000;white-space:pre-line;';
    this.root.append(this.title, this.step);

    this.banner = document.createElement('div');
    this.banner.className = 'dsh-panel banner';
    this.banner.style.cssText = [
      'position:absolute', 'left:50%', 'top:96px', 'transform:translateX(-50%)',
      'padding:14px 40px', 'text-align:center', 'display:none', 'z-index:90',
    ].join(';');
    stage.append(this.root, this.banner);

    bus.on('quest:changed', () => this.refresh());
    bus.on('quest:accepted', () => this.refresh());
    bus.on('quest:completed', ({ name }) => this.showBanner(`任务完成 · ${name}`));
    this.refresh();
  }

  refresh(): void {
    const tracked = this.quests.getTracked();
    if (!tracked) {
      this.root.style.display = 'none';
      return;
    }
    const { quest, def } = tracked;
    this.root.style.display = 'block';
    this.title.textContent = `【主线】${def.name}`;
    const s = def.steps[quest.stepIndex];
    if (s) {
      const need = s.count ?? 1;
      const have = quest.counts[`${quest.stepIndex}`] ?? 0;
      const hint = STEP_HINTS[s.type] ? `\n<span style="opacity:0.75;font-size:11px;">↳ ${STEP_HINTS[s.type]}</span>` : '';
      this.step.innerHTML = `▸ ${s.desc}${need > 1 ? `(${have}/${need})` : ''}${hint}`;
    } else {
      this.step.textContent = '▸ 即将完成……';
    }
  }

  showBanner(text: string, durMs = 2600): void {
    this.banner.innerHTML = `<div class="dsh-label title-lg" style="font-size:20px;">${text}</div>`;
    this.banner.style.display = 'block';
    this.banner.style.animation = 'none';
    void this.banner.offsetWidth;
    this.banner.style.animation = 'dsh-banner-in 0.3s ease both';
    this.bannerTimer = durMs / 1000;
  }

  update(dt: number): void {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.banner.style.display = 'none';
    }
  }
}
