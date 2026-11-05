/**
 * 自由选章 / 剧情回顾面板(C 档修复,PROMPT §2.4 / §8.3.1)。
 *
 * 左下常驻「章节回顾」按钮,点击展开九宫格浮层,任选一章直接跳入:
 * 切到该章场景、接取引子任务,场景 / NPC / 引子对话 / 卷首旁白经既有管线自动呈现。
 * 与右侧 StoryNav(线性解锁回访)互为补充,本面板不做解锁限制。
 */

import { CHAPTER_SCRIPTS, CHAPTER_ORDER, type ChapterKey } from '../data/story/chapters.js';
import { CHAPTER_LIST } from './StoryNav.js';

export class ChapterSelect {
  private readonly trigger: HTMLButtonElement;
  private readonly overlay: HTMLDivElement;
  private open = false;
  private readonly go: (key: string) => void;

  constructor(stage: { append(node: HTMLElement): void }, go: (key: string) => void) {
    this.go = go;

    // 触发按钮(左下常驻)
    this.trigger = document.createElement('button');
    this.trigger.className = 'dsh-btn';
    this.trigger.textContent = '章节回顾';
    this.trigger.style.cssText = [
      'position:absolute', 'left:14px', 'bottom:14px', 'z-index:60',
      'padding:6px 14px', 'font-size:13px', 'letter-spacing:2px',
      'cursor:pointer', 'pointer-events:auto',
    ].join(';');
    this.trigger.addEventListener('click', () => this.toggle());

    // 浮层遮罩
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = [
      'position:absolute', 'inset:0', 'z-index:90',
      'background:rgba(8,10,9,0.78)', 'display:none',
      'align-items:center', 'justify-content:center', 'pointer-events:auto',
    ].join(';');
    this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this.close(); });

    const panel = document.createElement('div');
    panel.style.cssText = [
      'width:min(880px,92vw)', 'max-height:86vh', 'overflow:auto',
      'background:linear-gradient(160deg,#17130e,#0e0c0a)', 'border:1px solid rgba(201,162,92,0.5)',
      'border-radius:14px', 'padding:22px 24px', 'box-shadow:0 12px 40px rgba(0,0,0,0.6)',
      'color:#e8e2d3', 'font-family:inherit',
    ].join(';');

    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;';
    const title = document.createElement('div');
    title.className = 'dsh-label';
    title.style.cssText = 'font-size:18px;letter-spacing:4px;color:#c9a25c;';
    title.textContent = '章 节 回 顾';
    const close = document.createElement('button');
    close.className = 'dsh-btn';
    close.textContent = '✕';
    close.style.cssText = 'width:30px;height:30px;border-radius:50%;cursor:pointer;';
    close.addEventListener('click', () => this.close());
    head.append(title, close);
    panel.append(head);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:12px;';
    for (const key of CHAPTER_ORDER) {
      const s = CHAPTER_SCRIPTS[key as ChapterKey];
      const mapName = CHAPTER_LIST.find((c) => c.key === key)?.name ?? s.mapId;
      const card = document.createElement('button');
      card.className = 'dsh-btn';
      card.style.cssText = [
        'text-align:left', 'padding:12px 14px', 'border-radius:10px',
        'border:1px solid rgba(201,162,92,0.35)', 'cursor:pointer',
        'display:flex', 'flex-direction:column', 'gap:6px', 'transition:all .15s ease',
      ].join(';');
      card.innerHTML =
        `<div style="font-size:16px;color:#ffd45e;letter-spacing:2px;">${s.label} · ${s.title}</div>` +
        `<div style="font-size:12px;color:#c9a25c;">${mapName}</div>` +
        `<div style="font-size:12px;line-height:1.5;color:#cfc8b8;">${s.synopsis}</div>` +
        `<div style="font-size:11px;color:#8a8474;">登场：${s.cast}</div>`;
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = '#ffd45e';
        card.style.background = 'rgba(201,162,92,0.08)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'rgba(201,162,92,0.35)';
        card.style.background = 'transparent';
      });
      card.addEventListener('click', () => { this.close(); this.go(key); });
      grid.append(card);
    }
    panel.append(grid);

    const tip = document.createElement('div');
    tip.style.cssText = 'margin-top:14px;font-size:11px;color:#8a8474;letter-spacing:1px;';
    tip.textContent = '自由选章将跳至该章场景并接取引子任务,可任意跳转回顾;主线进度以当前实际章节为准。';
    panel.append(tip);

    this.overlay.append(panel);
    stage.append(this.trigger);
    stage.append(this.overlay);
  }

  private toggle(): void {
    this.open ? this.close() : this.show();
  }

  private show(): void {
    this.open = true;
    this.overlay.style.display = 'flex';
  }

  private close(): void {
    this.open = false;
    this.overlay.style.display = 'none';
  }
}
