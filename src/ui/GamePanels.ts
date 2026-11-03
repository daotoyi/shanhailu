import { ITEMS, QUALITY_COLOR, QUALITY_LABEL, EQUIP_SLOT_LABEL, type EquipSlot } from '../data/items.js';
import { RECIPES } from '../data/recipes.js';
import { CITY_SHOP } from '../data/progression.js';
import type { Inventory } from '../gameplay/Inventory.js';
import type { Equipment } from '../gameplay/Equipment.js';
import type { Progression } from '../gameplay/Progression.js';
import type { Alchemy } from '../gameplay/Alchemy.js';
import type { EventBus } from '../core/events.js';

export type PanelTab = 'bag' | 'equip' | 'alchemy' | 'shop';

/**
 * 游戏主面板(国风卷轴,四页签):背包/装备/炼药/商店(PROMPT §3.8/3.10/3.11)。
 * B 开关;商店交互点自动开到商店页;Esc 关闭。
 */
export class GamePanels {
  private readonly root: HTMLDivElement;
  private readonly tabsBar: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private readonly coinLabel: HTMLDivElement;
  private tab: PanelTab = 'bag';
  private visible = false;
  private dirty = true;
  private onCloseCbs = new Set<() => void>();

  constructor(
    private readonly inventory: Inventory,
    private readonly equipment: Equipment,
    private readonly progression: Progression,
    private readonly alchemy: Alchemy,
    bus: EventBus,
    stage: { append(...nodes: HTMLElement[]): void },
    private readonly hooks: {
      onUseItem: (bagIndex: number) => void;
      onEquipChanged: () => void;
    },
  ) {
    this.root = document.createElement('div');
    this.root.className = 'dsh-panel';
    this.root.style.cssText = [
      'position:absolute', 'left:50%', 'top:50%', 'transform:translate(-50%,-50%)',
      'width:860px', 'height:520px', 'display:none', 'z-index:105', 'pointer-events:auto',
    ].join(';');
    const title = document.createElement('div');
    title.className = 'dsh-panel-title';
    title.textContent = '行 囊 · 修 行';
    this.coinLabel = document.createElement('div');
    this.coinLabel.className = 'dsh-label gold';
    this.coinLabel.style.cssText = 'position:absolute;right:20px;top:12px;font-size:14px;';

    this.tabsBar = document.createElement('div');
    this.tabsBar.style.cssText = 'display:flex;gap:6px;padding:12px 18px 0;';
    for (const [key, label] of [['bag', '背包'], ['equip', '装备'], ['alchemy', '炼药'], ['shop', '商店']] as const) {
      const b = document.createElement('button');
      b.className = 'dsh-btn';
      b.style.cssText = 'font-size:13px;padding:6px 18px;letter-spacing:3px;';
      b.dataset.tab = key;
      b.textContent = label;
      b.addEventListener('click', () => this.open(key));
      this.tabsBar.append(b);
    }

    this.body = document.createElement('div');
    this.body.style.cssText = 'flex:1;overflow-y:auto;padding:14px 18px;';
    this.root.style.display = 'flex';
    this.root.style.flexDirection = 'column';
    this.root.append(title, this.coinLabel, this.tabsBar, this.body);

    stage.append(this.root);
    bus.on('input:action', ({ action, phase }) => {
      if (phase !== 'start') return;
      if (action === 'toggleBag') this.toggle();
      if (action === 'toggleAlchemy') this.open(this.visible && this.tab === 'alchemy' ? 'bag' : 'alchemy');
    });
    this.render();
  }

  onClosed(cb: () => void): void {
    this.onCloseCbs.add(cb);
  }

  get isOpen(): boolean {
    return this.visible;
  }

  open(tab?: PanelTab): void {
    this.visible = true;
    if (tab) this.tab = tab;
    this.root.style.display = 'flex';
    this.root.classList.remove('leave');
    this.root.classList.add('enter');
    this.dirty = true;
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

  toggle(): void {
    if (this.visible) this.close();
    else this.open();
  }

  markDirty(): void {
    this.dirty = true;
  }

  update(): void {
    if (this.visible && this.dirty) {
      this.dirty = false;
      this.render();
    }
    this.coinLabel.textContent = `贝币 ${this.inventory.coins}`;
  }

  /* ---------- 渲染 ---------- */

  private render(): void {
    for (const b of this.tabsBar.children) {
      const btn = b as HTMLButtonElement;
      btn.style.borderColor = btn.dataset.tab === this.tab ? '#c9a25c' : 'rgba(201,162,92,0.35)';
      btn.style.color = btn.dataset.tab === this.tab ? '#ffd45e' : '#e8e2d3';
    }
    this.body.innerHTML = '';
    if (this.tab === 'bag') this.renderBag();
    else if (this.tab === 'equip') this.renderEquip();
    else if (this.tab === 'alchemy') this.renderAlchemy();
    else this.renderShop();
  }

  private itemChip(itemId: string, count: number, enhance?: number): HTMLDivElement {
    const def = ITEMS[itemId];
    const chip = document.createElement('div');
    chip.style.cssText = [
      'width:100%', 'display:flex', 'gap:10px', 'align-items:center',
      'padding:7px 10px', 'border:1px solid rgba(201,162,92,0.25)', 'border-radius:3px',
      'background:rgba(23,19,14,0.5)',
    ].join(';');
    const icon = document.createElement('div');
    icon.style.cssText = [
      'width:38px;height:38px;flex:0 0 auto;border-radius:4px;',
      'display:flex;align-items:center;justify-content:center;font-size:17px;',
      `color:${QUALITY_COLOR[def?.quality ?? 0]};`,
      `border:1px solid ${QUALITY_COLOR[def?.quality ?? 0]}66;`,
      'background:linear-gradient(160deg,rgba(43,32,24,0.9),#17130e);',
    ].join(';');
    icon.textContent = def?.name?.slice(0, 1) ?? '?';
    const mid = document.createElement('div');
    mid.style.cssText = 'flex:1;min-width:0;';
    mid.innerHTML = `<div style="font-size:13px;color:${QUALITY_COLOR[def?.quality ?? 0]};">${def?.name ?? itemId}${enhance ? ` <span style="color:#ffd45e;">+${enhance}</span>` : ''} <span style="opacity:0.6;font-size:11px;">${QUALITY_LABEL[def?.quality ?? 0]}</span></div>` +
      `<div style="font-size:11px;color:rgba(232,226,211,0.55);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${def?.desc ?? ''}</div>`;
    const right = document.createElement('div');
    right.style.cssText = 'text-align:right;font-size:12px;color:#e8e2d3;flex:0 0 auto;';
    right.textContent = count > 1 ? `×${count}` : `${def?.sell ?? 0}贝`;
    chip.append(icon, mid, right);
    return chip;
  }

  private actionBtn(label: string, fn: () => void, accent = false): HTMLButtonElement {
    const b = document.createElement('button');
    b.className = 'dsh-btn';
    if (accent) b.classList.add('accent');
    b.style.cssText = 'font-size:12px;padding:5px 14px;flex:0 0 auto;';
    b.textContent = label;
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      fn();
      this.dirty = true;
    });
    return b;
  }

  private renderBag(): void {
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;';
    this.inventory.slots.forEach((s, i) => {
      const cell = document.createElement('div');
      cell.style.cssText = 'min-height:52px;';
      if (s) {
        const chip = this.itemChip(s.itemId, s.count, s.enhance);
        const def = ITEMS[s.itemId];
        const acts = document.createElement('div');
        acts.style.cssText = 'display:flex;gap:4px;';
        if (def?.effects) acts.append(this.actionBtn('使用', () => this.hooks.onUseItem(i)));
        if (def?.equip) acts.append(this.actionBtn('装备', () => {
          this.equipment.equipFromBag(i);
          this.hooks.onEquipChanged();
        }));
        acts.append(this.actionBtn('卖', () => {
          this.alchemy.sellItem(i, 1);
        }));
        chip.append(acts);
        cell.append(chip);
      } else {
        cell.style.border = '1px dashed rgba(201,162,92,0.15)';
        cell.style.borderRadius = '3px';
      }
      grid.append(cell);
    });
    const sortBtn = this.actionBtn('整理行囊', () => this.inventory.sort());
    sortBtn.style.alignSelf = 'flex-start';
    sortBtn.style.marginTop = '10px';
    this.body.append(grid, sortBtn);
  }

  private renderEquip(): void {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
    (Object.keys(EQUIP_SLOT_LABEL) as EquipSlot[]).forEach((slot) => {
      const s = this.equipment.slots[slot];
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px 10px;border:1px solid rgba(201,162,92,0.2);border-radius:3px;';
      const label = document.createElement('div');
      label.style.cssText = 'width:52px;font-size:12px;color:#c9a25c;letter-spacing:2px;flex:0 0 auto;';
      label.textContent = EQUIP_SLOT_LABEL[slot];
      if (s) {
        const chip = this.itemChip(s.itemId, 1, s.enhance);
        chip.style.flex = '1';
        const un = this.actionBtn('卸下', () => {
          this.equipment.unequip(slot);
          this.hooks.onEquipChanged();
        });
        const en = this.actionBtn(`强化(${10 + (s.enhance ?? 0) ** 2 * 6}贝)`, () => {
          if (this.equipment.enhance(slot)) this.hooks.onEquipChanged();
          else this.dirty = true;
        }, true);
        row.append(label, chip, en, un);
      } else {
        const empty = document.createElement('div');
        empty.style.cssText = 'flex:1;font-size:12px;color:rgba(232,226,211,0.35);';
        empty.textContent = '(空)';
        row.append(label, empty);
      }
      wrap.append(row);
    });
    // 属性总览
    const st = this.progression.finalStats;
    const info = document.createElement('div');
    info.className = 'dsh-label dim';
    info.style.cssText = 'font-size:12px;line-height:1.9;margin-top:12px;';
    info.innerHTML =
      `境界 <span style="color:#c9a25c;">${this.progression.realm.name}</span> · 等级 ${this.progression.level}` +
      `<br>生命 ${Math.round(st.maxHp)} · 灵力 ${Math.round(st.maxMp)} · 攻击 ${st.atk.toFixed(1)} · 防御 ${st.def.toFixed(1)}` +
      `<br>暴击 ${(st.crit * 100).toFixed(0)}% · 爆伤 ${(st.critDmg * 100).toFixed(0)}% · 闪避 ${(st.dodge * 100).toFixed(0)}%`;
    if (this.progression.canBreakthrough) {
      const bt = this.actionBtn(`突破 → ${this.progression.realmList[this.progression.realmIndex + 1]!.name}`, () => {
        this.progression.breakthrough();
        this.hooks.onEquipChanged();
      }, true);
      bt.style.marginTop = '8px';
      info.append(document.createElement('br'), bt);
    }
    this.body.append(wrap, info);
  }

  private renderAlchemy(): void {
    const head = document.createElement('div');
    head.className = 'dsh-label';
    head.style.cssText = 'font-size:13px;margin-bottom:10px;';
    head.innerHTML = `药炉 · 炼药 <span class="dsh-label gold">Lv.${this.alchemy.level}</span> <span class="dsh-label dim" style="font-size:11px;">(等级越高成功率越高)</span>`;
    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
    for (const r of RECIPES) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid rgba(201,162,92,0.22);border-radius:3px;';
      const mid = document.createElement('div');
      mid.style.cssText = 'flex:1;';
      const mats = r.inputs.map(([id, n]) => `${ITEMS[id]?.name ?? id}×${n}(<span style="color:${this.inventory.countOf(id) >= n ? '#8fe0a8' : '#b03a2e'}">${this.inventory.countOf(id)}/${n}</span>)`).join(' ');
      const rate = Math.round(this.alchemy.successRate(r) * 100);
      mid.innerHTML = `<div style="font-size:13px;color:#e8e2d3;">${r.name} <span style="opacity:0.55;font-size:11px;">成功率 ${rate}%${r.levelReq > 0 ? ` · 需 Lv${r.levelReq}` : ''}</span></div>` +
        `<div style="font-size:11px;color:rgba(232,226,211,0.55);">${mats}</div>`;
      const btn = this.actionBtn('炼制', () => {
        const res = this.alchemy.brew(r.id);
        if (res.ok) this.dirty = true;
      }, true);
      btn.disabled = !this.alchemy.canBrew(r);
      row.append(mid, btn);
      list.append(row);
    }
    this.body.append(head, list);
  }

  private renderShop(): void {
    const head = document.createElement('div');
    head.className = 'dsh-label';
    head.style.cssText = 'font-size:13px;margin-bottom:10px;';
    head.innerHTML = `${CITY_SHOP.name} · <span class="dsh-label gold">贝币 ${this.inventory.coins}</span>`;
    const list = document.createElement('div');
    list.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;';
    for (const s of CITY_SHOP.stock) {
      const cell = document.createElement('div');
      const chip = this.itemChip(s.itemId, 1);
      const buy = this.actionBtn(`${s.price}贝`, () => {
        if (!this.alchemy.buy(s.itemId, s.price, 1)) this.dirty = true;
        this.dirty = true;
      });
      chip.append(buy);
      cell.append(chip);
      list.append(cell);
    }
    const hint = document.createElement('div');
    hint.className = 'dsh-label dim';
    hint.style.cssText = 'font-size:11px;margin-top:10px;';
    hint.textContent = '出售:背包页每件物品旁的「卖」。';
    this.body.append(head, list, hint);
  }
}
