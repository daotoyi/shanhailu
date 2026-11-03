import type { DialogNode } from '../data/story/dialogs.js';
import type { DialogRunner, DialogUI as IDialogUI } from '../gameplay/DialogRunner.js';
import type { CharacterPalette } from '../data/character-palettes.js';

/** 头像配色(程序化印章式头像:底色+首字) */
const PORTRAIT_COLORS: Record<string, string> = {
  player: '#3f6f5f',
  master: '#8a7355',
  courier: '#6b5b45',
  npc: '#556',
};

/**
 * 对话框 DOM 后端(PROMPT §3.2):打字机/印章头像/选项分支/回顾。
 * 底部横幅式;选项金边高亮;数字键 1-3 或点击选择。
 */
export class DialogUIDom implements IDialogUI {
  private readonly root: HTMLDivElement;
  private readonly box: HTMLDivElement;
  private readonly portrait: HTMLDivElement;
  private readonly speaker: HTMLDivElement;
  private readonly text: HTMLDivElement;
  private readonly hint: HTMLDivElement;
  private readonly choicesBox: HTMLDivElement;
  private readonly logPanel: HTMLDivElement;
  private choices: { index: number; text: string }[] = [];
  private advanceCbs = new Set<() => void>();
  private runner: DialogRunner | null = null;

  constructor(stage: { append(node: HTMLElement): void }) {
    this.root = document.createElement('div');
    this.root.style.cssText = 'position:absolute;inset:0;pointer-events:none;display:none;z-index:80;';

    // 回顾面板(左上,半透明)
    this.logPanel = document.createElement('div');
    this.logPanel.className = 'dsh-panel';
    this.logPanel.style.cssText =
      'position:absolute;left:24px;top:64px;width:300px;max-height:420px;overflow-y:auto;padding:10px 14px;display:none;font-size:12px;line-height:1.7;';
    this.root.append(this.logPanel);

    this.box = document.createElement('div');
    this.box.className = 'dsh-panel';
    this.box.style.cssText = [
      'position:absolute', 'left:50%', 'bottom:36px', 'transform:translateX(-50%)',
      'width:980px', 'min-height:150px', 'padding:18px 24px 14px',
      'display:flex', 'gap:18px', 'align-items:flex-start',
      'pointer-events:auto',
    ].join(';');

    this.portrait = document.createElement('div');
    this.portrait.style.cssText = [
      'width:76px', 'height:76px', 'flex:0 0 auto', 'border-radius:6px',
      'border:1px solid rgba(201,162,92,0.8)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'font-size:38px', 'color:#e8e2d3', 'text-shadow:0 1px 3px rgba(0,0,0,0.7)',
      'box-shadow:inset 0 0 16px rgba(0,0,0,0.4)',
    ].join(';');

    const right = document.createElement('div');
    right.style.cssText = 'flex:1;min-width:0;';
    this.speaker = document.createElement('div');
    this.speaker.className = 'dsh-label gold';
    this.speaker.style.cssText = 'font-size:17px;margin-bottom:6px;letter-spacing:4px;';
    this.text = document.createElement('div');
    this.text.style.cssText = 'font-size:16px;line-height:1.75;letter-spacing:1px;min-height:56px;color:#e8e2d3;';
    this.choicesBox = document.createElement('div');
    this.choicesBox.style.cssText = 'margin-top:8px;display:flex;flex-direction:column;gap:6px;';
    this.hint = document.createElement('div');
    this.hint.className = 'dsh-label dim';
    this.hint.style.cssText = 'font-size:11px;margin-top:6px;text-align:right;';
    this.hint.textContent = '空格 / 点击 继续 · L 回顾';
    right.append(this.speaker, this.text, this.choicesBox, this.hint);
    this.box.append(this.portrait, right);
    this.root.append(this.box);
    stage.append(this.root);

    this.box.addEventListener('click', () => this.advanceCbs.forEach((cb) => cb()));
    window.addEventListener('keydown', this.onKey);
  }

  bindRunner(runner: DialogRunner): void {
    this.runner = runner;
  }

  private onKey = (e: KeyboardEvent): void => {
    if (this.root.style.display === 'none') return;
    if (e.code === 'KeyL') {
      this.toggleLog();
      return;
    }
  };

  private toggleLog(): void {
    const runner = this.runner;
    if (!runner) return;
    if (this.logPanel.style.display === 'block') {
      this.logPanel.style.display = 'none';
      return;
    }
    const rows = runner.log
      .slice(-30)
      .map((h) => `<div style="margin-bottom:6px;"><span style="color:#c9a25c;">${h.speaker}</span>:${h.text}</div>`)
      .join('');
    this.logPanel.innerHTML = rows || '<div class="dsh-label dim">(暂无回顾)</div>';
    this.logPanel.style.display = 'block';
  }

  private charOf(portrait?: string): { label: string; color: string } {
    const key = portrait ?? 'npc';
    const color = PORTRAIT_COLORS[key] ?? '#556';
    const label = key === 'player' ? '松' : key === 'master' ? '翁' : key === 'courier' ? '驿' : '民';
    return { label, color };
  }

  show(): void {
    this.root.style.display = 'block';
    this.advanceCbs.add(() => this.runner?.advance());
  }

  hide(): void {
    this.root.style.display = 'none';
    this.logPanel.style.display = 'none';
    this.advanceCbs.clear();
  }

  render(node: DialogNode, choices: { index: number; text: string }[]): void {
    const { label, color } = this.charOf(node.portrait);
    this.portrait.style.background = `linear-gradient(160deg, ${color}, #17130e)`;
    this.portrait.textContent = label;
    this.speaker.textContent = node.speaker ?? '';
    const full = node.text;
    // 打字机由 updateTyping 驱动;先渲染空文本
    this.text.dataset.full = full;
    this.text.textContent = '';
    this.choices = choices;
    this.choicesBox.innerHTML = '';
    for (const c of choices) {
      const btn = document.createElement('button');
      btn.className = 'dsh-btn';
      btn.style.cssText = 'text-align:left;font-size:14px;padding:6px 14px;letter-spacing:2px;';
      btn.textContent = `${c.index}. ${c.text}`;
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.onChoiceIndex(c.index);
      });
      this.choicesBox.append(btn);
    }
    if (choices.length > 0) {
      this.hint.textContent = '点击选项 或按 1-3';
    } else {
      this.hint.textContent = '空格 / 点击 继续 · L 回顾';
    }
  }

  updateTyping(count: number): void {
    const full = this.text.dataset.full ?? '';
    this.text.textContent = full.slice(0, count);
  }

  onAdvance(): void {
    this.advanceCbs.forEach((cb) => cb());
  }

  onChoiceIndex(i: number): void {
    this.runner?.choose(i);
  }

  /** 暴露给 DialogueRunner 构造闭包用 */
  static attachPalette(_p: CharacterPalette): void {
    void _p;
  }
}
