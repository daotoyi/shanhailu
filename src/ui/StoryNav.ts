/**
 * 右侧章节导航(M9+ 反馈):竖排"模块剧情"圆章,点击进入对应章节地图。
 * 已达章节可自由回访(不改任务进度);未达章节锁定;当前章高亮。
 */

export interface ChapterEntry {
  key: string;
  label: string;
  name: string;
  mapId: string;
  spawnId: string;
}

export const CHAPTER_LIST: ChapterEntry[] = [
  { key: 'prologue', label: '序', name: '蛮荒之始 · 药王谷', mapId: 'yaowang-valley', spawnId: 'start' },
  { key: 'ch1', label: '壹', name: '神农遗命 · 药王谷', mapId: 'yaowang-valley', spawnId: 'start' },
  { key: 'ch2', label: '贰', name: '苗疆结义 · 九黎南疆', mapId: 'jiuli-nanjiang', spawnId: 'entry' },
  { key: 'ch3', label: '叁', name: '汤谷十日 · 东海汤谷', mapId: 'tanggu', spawnId: 'entry' },
  { key: 'ch4', label: '肆', name: '蜃楼迷踪 · 蜃楼迷城', mapId: 'shenlou-city', spawnId: 'entry' },
  { key: 'ch5', label: '伍', name: '昆仑蟠桃会 · 瑶池', mapId: 'kunlun', spawnId: 'entry' },
  { key: 'ch6', label: '陆', name: '幽都问魂 · 鬼界', mapId: 'youdu', spawnId: 'entry' },
  { key: 'ch7', label: '柒', name: '水妖之乱 · 大荒水泽', mapId: 'shuize', spawnId: 'entry' },
  { key: 'ch8', label: '终', name: '不周天倾 · 不周山', mapId: 'buzhou', spawnId: 'entry' },
];

const CHAPTER_ORDER = CHAPTER_LIST.map((c) => c.key);

export class StoryNav {
  private readonly root: HTMLDivElement;
  private readonly chips: HTMLDivElement[] = [];
  private currentChapter = 'prologue';
  private goChapter: (entry: ChapterEntry) => void;

  constructor(
    stage: { append(node: HTMLElement): void },
    go: (entry: ChapterEntry) => void,
  ) {
    this.goChapter = go;
    this.root = document.createElement('div');
    this.root.style.cssText = [
      'position:absolute', 'right:14px', 'top:336px',
      'display:flex', 'flex-direction:column', 'gap:7px', 'z-index:55',
      'align-items:center', 'pointer-events:auto',
    ].join(';');
    const cap = document.createElement('div');
    cap.className = 'dsh-label dim';
    cap.style.cssText = 'font-size:10px;letter-spacing:2px;margin-bottom:2px;writing-mode:vertical-rl;';
    cap.textContent = '卷 章';
    this.root.append(cap);
    for (const entry of CHAPTER_LIST) {
      const chip = document.createElement('div');
      chip.className = 'dsh-btn';
      chip.style.cssText = [
        'width:34px;height:34px;border-radius:50%;padding:0;margin:0;text-indent:0;letter-spacing:0;',
        'display:flex;align-items:center;justify-content:center;font-size:15px;',
        'cursor:pointer;transition:all 0.2s ease;',
      ].join(';');
      chip.textContent = entry.label;
      chip.addEventListener('click', () => this.tryGo(entry));
      this.chips.push(chip);
      this.root.append(chip);
    }
    stage.append(this.root);
  }

  private tryGo(entry: ChapterEntry): void {
    if (!this.isUnlocked(entry.key)) {
      const idx = CHAPTER_LIST.indexOf(entry);
      const chip = this.chips[idx];
      if (chip) this.flash(chip, '尚未解锁');
      return;
    }
    this.goChapter(entry);
  }

  private flash(chip: HTMLDivElement, _msg: string): void {
    chip.style.animation = 'none';
    void chip.offsetWidth;
    chip.style.animation = 'dsh-banner-in 0.3s ease both';
  }

  /** 章节是否已抵达(当前章序之内) */
  private isUnlocked(key: string): boolean {
    const cur = CHAPTER_ORDER.indexOf(this.currentChapter);
    const target = CHAPTER_ORDER.indexOf(key);
    return target >= 0 && target <= Math.max(0, cur);
  }

  /** 每帧调用:依当前章节刷新高亮/锁定(廉价,内部比对) */
  update(chapter: string): void {
    if (chapter === this.currentChapter) return;
    this.currentChapter = chapter;
    CHAPTER_LIST.forEach((entry, i) => {
      const chip = this.chips[i]!;
      const unlocked = this.isUnlocked(entry.key);
      const active = entry.key === chapter;
      chip.style.opacity = unlocked ? '1' : '0.35';
      chip.style.borderColor = active ? '#ffd45e' : 'rgba(201,162,92,0.6)';
      chip.style.color = active ? '#ffd45e' : unlocked ? '#e8e2d3' : 'rgba(232,226,211,0.4)';
      chip.style.boxShadow = active ? '0 0 12px rgba(255,212,94,0.45)' : 'none';
      chip.title = unlocked ? `第${entry.label}章 · ${entry.name}` : `尚未解锁:${entry.name}`;
    });
  }
}
