import type {
  IUIButton,
  IUILabel,
  IUIPanel,
  IUIProgressBar,
} from '../framework/types.js';

/**
 * UI 组件的 DOM 后端实现(PROMPT §4.5)。
 * 这是全项目除 core/PAL/web 之外唯一允许触碰 DOM 的文件群。
 * M9 微信小游戏时以 canvas 后端实现同一接口替换本文件群。
 */

function el(tag: string, className?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

export function createLabel(variant: IUILabel extends never ? never : 'normal' | 'dim' | 'gold' | 'title-lg' = 'normal'): IUILabel & { node: HTMLElement } {
  const node = el('div', 'dsh-label');
  if (variant !== 'normal') node.classList.add(variant);
  return {
    node,
    setText(text) {
      node.textContent = text;
    },
    setVariant(v) {
      node.className = v === 'normal' ? 'dsh-label' : `dsh-label ${v}`;
    },
  };
}

export function createButton(label: string): IUIButton & { node: HTMLButtonElement } {
  const node = el('button', 'dsh-btn') as HTMLButtonElement;
  node.textContent = label;
  const cbs = new Set<() => void>();
  node.addEventListener('click', () => {
    if (!node.disabled) for (const cb of cbs) cb();
  });
  return {
    node,
    setLabel(text) {
      node.textContent = text;
    },
    setEnabled(enabled) {
      node.disabled = !enabled;
    },
    onClick(cb) {
      cbs.add(cb);
    },
  };
}

export function createProgressBar(): IUIProgressBar & { node: HTMLElement; fill: HTMLElement } {
  const node = el('div', 'dsh-bar');
  const fill = el('div', 'dsh-bar-fill');
  node.appendChild(fill);
  return {
    node,
    fill,
    setRatio(ratio) {
      fill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    },
  };
}

export function createPanel(opts: { title?: string; x?: number; y?: number; w?: number; h?: number } = {}): IUIPanel & { node: HTMLDivElement } {
  const node = el('div', 'dsh-panel') as HTMLDivElement;
  if (opts.title) {
    const title = el('div', 'dsh-panel-title');
    title.textContent = opts.title;
    node.appendChild(title);
  }
  if (opts.w !== undefined) node.style.width = `${opts.w}px`;
  if (opts.h !== undefined) node.style.height = `${opts.h}px`;
  node.style.left = `${opts.x ?? 0}px`;
  node.style.top = `${opts.y ?? 0}px`;

  return {
    node,
    open() {
      node.style.display = 'block';
      node.classList.remove('leave');
      // 强制重排以重触发动画
      void node.offsetWidth;
      node.classList.add('enter');
    },
    close(onClosed) {
      node.classList.remove('enter');
      node.classList.add('leave');
      const done = () => {
        node.style.display = 'none';
        onClosed?.();
      };
      let handled = false;
      const once = () => {
        if (handled) return;
        handled = true;
        node.removeEventListener('animationend', once);
        done();
      };
      node.addEventListener('animationend', once);
      // 动画被禁用等场景兜底
      window.setTimeout(once, 300);
    },
    get visible() {
      return node.style.display !== 'none';
    },
    root: node,
  };
}
