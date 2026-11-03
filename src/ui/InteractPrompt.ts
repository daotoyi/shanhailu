/**
 * 交互提示(E 键):屏幕下方居中小字。
 */
export class InteractPrompt {
  private readonly el: HTMLDivElement;

  constructor(stage: { append(node: HTMLElement): void }) {
    this.el = document.createElement('div');
    this.el.className = 'dsh-panel';
    this.el.style.cssText = [
      'position:absolute', 'left:50%', 'bottom:210px', 'transform:translateX(-50%)',
      'padding:8px 22px', 'display:none', 'z-index:70', 'pointer-events:none',
    ].join(';');
    this.el.innerHTML = `<span style="color:#c9a25c;font-size:14px;letter-spacing:2px;">E</span> <span class="dsh-label" style="font-size:13px;" id="ip-text"></span>`;
    stage.append(this.el);
  }

  show(prompt: string): void {
    if (this.el.style.display !== 'flex') this.el.style.display = 'flex';
    const t = this.el.querySelector('#ip-text');
    if (t) t.textContent = prompt;
  }

  hide(): void {
    this.el.style.display = 'none';
  }
}
