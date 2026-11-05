import type { EventBus } from '../core/events.js';
import { DIALOGS, type DialogNode, type DialogTree } from '../data/story/dialogs.js';

export interface DialogAction {
  /** 效果指令:flag:key[:value] / quest:accept:id / quest:complete:id / quest:advance:id */
  apply: (action: string) => void;
}

const TYPE_SPEED = 0.028; // 秒/字

/**
 * 对话运行器:驱动 DialogTree,打字机/选项/效果指令,经 DialogUI 呈现。
 * 输入:点击/空格 = 快进或下一句;数字键 = 选项。
 */
export class DialogRunner {
  private tree: DialogTree | null = null;
  private node: DialogNode | null = null;
  private history: { speaker: string; text: string }[] = [];
  private onEnd: (() => void) | null = null;
  private typing = false;
  private typedChars = 0;
  private typedAcc = 0;
  private ui: DialogUI;
  private uiUnsubs: (() => void)[] = [];

  constructor(
    bus: EventBus,
    private readonly actionHandler: DialogAction['apply'],
    uiFactory: (runner: DialogRunner) => DialogUI,
  ) {
    this.ui = uiFactory(this);
    this.uiUnsubs.push(
      bus.on('input:action', ({ action, phase }) => {
        if (phase !== 'start' || !this.isOpen) return;
        if (action === 'interact' || action === 'dodge') this.ui.onAdvance();
        if (action === 'skill1') this.ui.onChoiceIndex(1);
        if (action === 'skill2') this.ui.onChoiceIndex(2);
        if (action === 'skill3') this.ui.onChoiceIndex(3);
      }),
    );
  }

  get isOpen(): boolean {
    return this.tree !== null;
  }

  get currentNode(): DialogNode | null {
    return this.node;
  }

  get typedCount(): number {
    return this.typedChars;
  }

  get isTyping(): boolean {
    return this.typing;
  }

  get log(): readonly { speaker: string; text: string }[] {
    return this.history;
  }

  start(dialogId: string, onEnd: () => void): void {
    const tree = DIALOGS[dialogId];
    if (!tree) {
      console.warn(`[Dialog] 未知对话: ${dialogId}`);
      onEnd();
      return;
    }
    this.tree = tree;
    this.onEnd = onEnd;
    this.history = [];
    this.ui.show();
    this.enter(tree.root);
  }

  private enter(nodeId: string): void {
    if (!this.tree) return;
    const node = this.tree.nodes[nodeId];
    if (!node) {
      this.finish();
      return;
    }
    this.node = node;
    this.typedChars = 0;
    this.typedAcc = 0;
    this.typing = true;
    this.ui.render(node, []);
  }

  /** UI 每帧喂 dt,推进打字机 */
  tick(dt: number): void {
    if (!this.isOpen || !this.node || !this.typing) return;
    this.typedAcc += dt;
    const total = this.node.text.length;
    const target = Math.min(total, Math.floor(this.typedAcc / TYPE_SPEED));
    if (target !== this.typedChars) {
      this.typedChars = target;
      this.ui.updateTyping(this.typedChars);
      if (this.typedChars >= total) this.onTypeDone();
    }
  }

  private onTypeDone(): void {
    this.typing = false;
    const node = this.node!;
    this.history.push({ speaker: node.speaker ?? '', text: node.text });
    const choices = (node.choices ?? []).map((c, i) => ({ index: i + 1, text: c.text }));
    this.ui.render(node, choices);
    // render 会清空正文以启动打字机;此处补全,避免打完字到玩家点击期间空白
    this.ui.updateTyping(node.text.length);
  }

  /** 快进:打字中→立即补全;已完→下一句 */
  advance(): void {
    if (!this.node) return;
    if (this.typing) {
      this.typedChars = this.node.text.length;
      this.ui.updateTyping(this.typedChars);
      this.onTypeDone();
      return;
    }
    const node = this.node;
    if (node.end) {
      this.finish();
      return;
    }
    if (node.next) {
      if (node.actions) for (const a of node.actions) this.actionHandler(a);
      this.enter(node.next);
    }
  }

  choose(index: number): void {
    if (!this.node?.choices) return;
    const c = this.node.choices[index - 1];
    if (!c) return;
    this.ui.render(this.node, []); // 清除选项
    this.enter(c.next);
  }

  private finish(): void {
    const node = this.node;
    if (node?.actions) for (const a of node.actions) this.actionHandler(a);
    this.tree = null;
    this.node = null;
    this.ui.hide();
    const cb = this.onEnd;
    this.onEnd = null;
    cb?.();
  }
}

/**
 * 对话 UI 接口(与渲染后端无关):DOM 后端见 ui/DialogUI.ts,M9 canvas 后端实现同接口。
 */
export interface DialogUI {
  show(): void;
  hide(): void;
  /** 渲染节点:choices 为空时表示尚在打字或无选项 */
  render(node: DialogNode, choices: { index: number; text: string }[]): void;
  /** 打字机进度更新 */
  updateTyping(count: number): void;
  onAdvance(): void;
  onChoiceIndex(i: number): void;
}
