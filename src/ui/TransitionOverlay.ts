/**
 * 全屏过渡遮罩(切图/重要过场):墨色渐入 → 地名+题记浮现 → 渐出。
 * 国风过场底子,M3 运镜过场复用。
 */
export class TransitionOverlay {
  private readonly root: HTMLDivElement;
  private readonly title: HTMLDivElement;
  private readonly sub: HTMLDivElement;
  private busy = false;
  /** 过渡期间的排队请求(覆盖式:只保留最后一次) */
  private queued: (() => void) | null = null;

  constructor(stage: { append(node: HTMLElement): void }) {
    this.root = document.createElement('div');
    this.root.style.cssText = [
      'position:absolute', 'inset:0', 'z-index:120',
      'display:none', 'align-items:center', 'justify-content:center',
      'flex-direction:column', 'gap:18px',
      'background:radial-gradient(ellipse 120% 100% at 50% 40%, rgba(23,19,14,0.96), rgba(10,8,5,1))',
      'opacity:0', 'transition:opacity 0.45s ease',
    ].join(';');
    this.title = document.createElement('div');
    this.title.style.cssText =
      'font-size:44px;letter-spacing:16px;text-indent:16px;color:#e8e2d3;text-shadow:0 0 30px rgba(201,162,92,0.4);opacity:0;transition:opacity 0.6s ease, letter-spacing 0.9s ease;';
    this.sub = document.createElement('div');
    this.sub.style.cssText =
      'font-size:15px;letter-spacing:8px;text-indent:8px;color:#c9a25c;opacity:0;transition:opacity 0.8s ease 0.2s;';
    this.root.append(this.title, this.sub);
    stage.append(this.root);
  }

  get isBusy(): boolean {
    return this.busy;
  }

  /** 过渡中调用则排队(覆盖式,只执行最后一次),空闲时立即执行 */
  queue(cb: () => void): void {
    if (this.busy) {
      this.queued = cb;
    } else {
      cb();
    }
  }

  /** 遮入 → 回调(切图等重活) → 遮出 */
  run(mapName: string, epigraph: string, work: () => void, done?: () => void): void {
    if (this.busy) return;
    this.busy = true;
    this.title.textContent = mapName;
    this.sub.textContent = epigraph;
    this.root.style.display = 'flex';
    requestAnimationFrame(() => {
      this.root.style.opacity = '1';
      this.title.style.opacity = '1';
      this.title.style.letterSpacing = '22px';
      this.sub.style.opacity = '1';
    });
    // 等遮入完成再干活
    window.setTimeout(() => {
      work();
      window.setTimeout(() => {
        this.root.style.opacity = '0';
        this.title.style.opacity = '0';
        this.sub.style.opacity = '0';
        this.title.style.letterSpacing = '16px';
        window.setTimeout(() => {
          this.root.style.display = 'none';
          this.busy = false;
          done?.();
          if (this.queued) {
            const q = this.queued;
            this.queued = null;
            q();
          }
        }, 480);
      }, 900);
    }, 520);
  }
}
