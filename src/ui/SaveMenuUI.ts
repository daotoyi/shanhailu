import type { SaveMeta, SaveSystem } from '../gameplay/SaveSystem.js';

/**
 * 神祠存档菜单(PROMPT §3.4 存档点):存档/读档(3 位)/导出码/传送。
 * 面板国风样式;Esc/E 关闭。
 */
export class SaveMenuUI {
  private readonly root: HTMLDivElement;
  private readonly slotsBox: HTMLDivElement;
  private visible = false;
  private onCloseCbs = new Set<() => void>();

  constructor(
    stage: { append(node: HTMLElement): void },
    private readonly save: SaveSystem,
    private readonly hooks: {
      onSave: (slot: number) => void;
      onLoad: (slot: number) => void;
      onTeleport: (mapId: string) => void;
      /** 当前是否允许传送(目标地图可达) */
      canTeleport: () => { mapId: string; label: string } | null;
    },
  ) {
    this.root = document.createElement('div');
    this.root.className = 'dsh-panel centered';
    this.root.style.cssText = [
      'position:absolute', 'left:50%', 'top:50%', 'transform:translate(-50%,-50%)',
      'width:520px', 'padding:22px 28px', 'display:none', 'z-index:110', 'pointer-events:auto',
    ].join(';');
    const title = document.createElement('div');
    title.className = 'dsh-panel-title';
    title.textContent = '神 祠 · 香 火 之 约';
    const hint = document.createElement('div');
    hint.className = 'dsh-label dim';
    hint.style.cssText = 'font-size:12px;text-align:center;margin:8px 0 14px;';
    hint.textContent = '神祠是上古存息之地:可歇息存档,亦可借香火远行。';
    this.status = document.createElement('div');
    this.status.className = 'dsh-label dim';
    this.status.style.cssText = 'font-size:12px;text-align:center;min-height:16px;margin:-6px 0 10px;color:#c9a25c;';
    this.slotsBox = document.createElement('div');
    this.slotsBox.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:10px;margin-top:16px;justify-content:center;flex-wrap:wrap;';
    this.teleportBtn = document.createElement('button');
    this.teleportBtn.className = 'dsh-btn accent';
    this.teleportBtn.style.fontSize = '13px';
    const exportBtn = document.createElement('button');
    exportBtn.className = 'dsh-btn';
    exportBtn.style.fontSize = '12px';
    exportBtn.textContent = '导出存档码';
    const importBtn = document.createElement('button');
    importBtn.className = 'dsh-btn';
    importBtn.style.fontSize = '12px';
    importBtn.textContent = '导入存档码';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'dsh-btn';
    closeBtn.style.fontSize = '12px';
    closeBtn.textContent = '离开 (E)';
    actions.append(this.teleportBtn, exportBtn, importBtn, closeBtn);
    this.root.append(title, hint, this.status, this.slotsBox, actions);
    stage.append(this.root);

    closeBtn.addEventListener('click', () => this.close());
    exportBtn.addEventListener('click', () => {
      const code = this.save.exportCode(0) ?? this.save.exportCode(1) ?? this.save.exportCode(2);
      this.teleportBtn.ownerDocument.defaultView?.prompt?.('存档码(自动档优先):', code ?? '(空)');
    });
    importBtn.addEventListener('click', () => {
      const view = this.root.ownerDocument.defaultView;
      const code = view?.prompt?.('粘贴存档码:');
      if (!code) return;
      const raw = view?.prompt?.('存入档位 (1 / 2 / 3):', '3');
      const slot = Number(raw) - 1;
      if (!Number.isInteger(slot) || slot < 0 || slot > 2) {
        this.setStatus('档位无效,请输入 1 / 2 / 3');
        return;
      }
      const ok = this.save.importCode(code, slot);
      this.setStatus(ok ? `存档码已导入档位 ${slot + 1}` : '存档码无效或版本不匹配');
      if (ok) this.renderSlots();
    });
  }

  private readonly teleportBtn: HTMLButtonElement;
  private readonly status: HTMLDivElement;

  private setStatus(text: string): void {
    this.status.textContent = text;
    window.setTimeout(() => {
      if (this.status.textContent === text) this.status.textContent = '';
    }, 3200);
  }

  private renderSlots(): void {
    this.slotsBox.innerHTML = '';
    const metas: (SaveMeta | null)[] = this.save.list();
    metas.forEach((m, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;align-items:center;';
      const label = document.createElement('div');
      label.className = 'dsh-label';
      label.style.cssText = `flex:1;font-size:13px;color:${m ? '#e8e2d3' : 'rgba(232,226,211,0.4)'};`;
      if (m) {
        const t = new Date(m.savedAt);
        const hh = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
        const mm = `${Math.floor(m.playtimeSec / 60)}分`;
        label.textContent = `档位${i + 1} · ${m.chapter === 'prologue' ? '序章' : m.chapter === 'ch1' ? '第一章' : m.chapter} · ${mm} · ${hh}`;
      } else {
        label.textContent = `档位${i + 1} · (空)`;
      }
      const saveBtn = document.createElement('button');
      saveBtn.className = 'dsh-btn';
      saveBtn.style.cssText = 'font-size:12px;padding:5px 14px;';
      saveBtn.textContent = '存入';
      saveBtn.addEventListener('click', () => {
        this.hooks.onSave(i);
        this.renderSlots();
      });
      const loadBtn = document.createElement('button');
      loadBtn.className = 'dsh-btn';
      loadBtn.style.cssText = 'font-size:12px;padding:5px 14px;';
      loadBtn.textContent = '读取';
      loadBtn.disabled = !m;
      loadBtn.addEventListener('click', () => {
        this.hooks.onLoad(i);
        this.close();
      });
      row.append(label, saveBtn, loadBtn);
      this.slotsBox.append(row);
    });
  }

  open(): void {
    this.visible = true;
    this.root.style.display = 'block';
    this.root.classList.remove('leave');
    this.root.classList.add('enter');
    const tp = this.hooks.canTeleport();
    this.teleportBtn.style.display = tp ? 'inline-block' : 'none';
    if (tp) {
      this.teleportBtn.textContent = `传送 · ${tp.label}`;
      this.teleportBtn.onclick = () => {
        this.close();
        this.hooks.onTeleport(tp.mapId);
      };
    }
    this.renderSlots();
  }

  close(): void {
    if (!this.visible) return;
    this.visible = false;
    this.root.classList.remove('enter');
    this.root.classList.add('leave');
    window.setTimeout(() => {
      this.root.style.display = 'none';
      this.onCloseCbs.forEach((cb) => cb());
    }, 240);
  }

  get isOpen(): boolean {
    return this.visible;
  }

  /** 关闭时回调(解除玩家冻结) */
  onClosed(cb: () => void): void {
    this.onCloseCbs.add(cb);
  }
}
