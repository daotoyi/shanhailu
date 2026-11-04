import { ITEMS, QUALITY_COLOR, QUALITY_LABEL, EQUIP_SLOT_LABEL, type EquipSlot } from '../data/items.js';
import { RECIPES } from '../data/recipes.js';
import { CITY_SHOP } from '../data/progression.js';
import { BEASTS } from '../data/bestiary.js';
import { ACHIEVEMENTS } from '../gameplay/Achievements.js';
import { QUALITY_ORDER, QUALITY_LABEL as QLABEL } from '../data/quality-presets.js';
import type { QualityLevel } from '../data/quality-presets.js';
import type { Inventory } from '../gameplay/Inventory.js';
import type { Equipment } from '../gameplay/Equipment.js';
import type { Progression } from '../gameplay/Progression.js';
import type { Alchemy } from '../gameplay/Alchemy.js';
import type { BeastSystem } from '../gameplay/BeastSystem.js';
import type { Achievements } from '../gameplay/Achievements.js';
import type { EventBus } from '../core/events.js';

export type PanelTab = 'bag' | 'equip' | 'alchemy' | 'shop' | 'bestiary' | 'achieve' | 'settings';

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
    private readonly beasts: BeastSystem,
    private readonly achievements: Achievements,
    bus: EventBus,
    stage: { append(...nodes: HTMLElement[]): void },
    private readonly hooks: {
      onUseItem: (bagIndex: number) => void;
      onEquipChanged: () => void;
      onQualityChange: (level: QualityLevel) => void;
      onSensitivityChange: (v: number) => void;
      onVolumeChange: (track: 'master' | 'bgm' | 'sfx', v: number) => void;
      getQuality: () => QualityLevel;
      getSensitivity: () => number;
      getVolumes: () => { master: number; bgm: number; sfx: number };
    },
  ) {
    this.root = document.createElement('div');
    this.root.className = 'dsh-panel centered';
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
    for (const [key, label] of [['bag', '背包'], ['equip', '装备'], ['alchemy', '炼药'], ['shop', '商店'], ['bestiary', '图鉴'], ['achieve', '成就'], ['settings', '设置']] as const) {
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
    else if (this.tab === 'bestiary') this.renderBestiary();
    else if (this.tab === 'achieve') this.renderAchievements();
    else if (this.tab === 'settings') this.renderSettings();
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

  /** 山海经异兽图鉴(PROMPT §3.12):击杀/契约进度 + 原文引句 */
  private renderBestiary(): void {
    const head = document.createElement('div');
    head.className = 'dsh-label';
    head.style.cssText = 'font-size:13px;margin-bottom:10px;';
    head.innerHTML = `山海经 · 异兽图鉴 <span class="dsh-label dim" style="font-size:11px;">(击杀或契约后解锁条目)</span>`;
    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
    for (const b of BEASTS) {
      const rec = this.beasts.records[b.id];
      const row = document.createElement('div');
      row.style.cssText = 'padding:10px 14px;border:1px solid rgba(201,162,92,0.3);border-radius:3px;background:rgba(23,19,14,0.45);';
      if (!rec || (rec.kills === 0 && !rec.caught)) {
        row.innerHTML = `<div style="font-size:14px;color:rgba(232,226,211,0.35);letter-spacing:3px;">??? · ${'未 睹 其 形'}</div>`;
      } else {
        const status = rec.caught ? '<span style="color:#ffd45e;">已契约</span>' : `击杀 ×${rec.kills}`;
        row.innerHTML =
          `<div style="font-size:15px;color:#c9a25c;letter-spacing:2px;">${b.name} <span style="font-size:11px;opacity:0.7;">${b.quoteSrc} · ${status}</span></div>` +
          `<div style="font-size:12px;color:#e8e2d3;opacity:0.85;margin-top:4px;line-height:1.6;">「${b.quote}」</div>` +
          `<div style="font-size:11px;color:rgba(232,226,211,0.55);margin-top:4px;">${b.lore}</div>`;
        if (rec.caught) {
          const c = this.beasts.contracted.find((x) => x.beastId === b.id);
          if (c) {
            const act = this.actionBtn(this.beasts.contracted[this.beasts.activeIndex] === c ? '休息' : '出战', () => {
              const idx = this.beasts.contracted.findIndex((x) => x.beastId === b.id);
              this.beasts.setActive(this.beasts.activeIndex === idx ? -1 : idx);
              this.dirty = true;
            }, true);
            const feed = this.actionBtn('喂养×5', () => {
              this.beasts.feed(b.id, 5);
              this.dirty = true;
            });
            const ride = this.actionBtn('骑乘', () => {
              const idx = this.beasts.contracted.findIndex((x) => x.beastId === b.id);
              this.beasts.setActive(idx);
              this.beasts.setRiding(true);
              this.dirty = true;
            });
            if (b.rideSpeed === 0) ride.disabled = true;
            const stage = document.createElement('span');
            stage.style.cssText = 'font-size:11px;color:#5fd2a0;margin-right:8px;';
            stage.textContent = `阶 ${c.stage}`;
            row.append(document.createElement('br'), stage, act, feed, ride);
          }
        }
      }
      list.append(row);
    }
    this.body.append(head, list);
  }

  /** 成就页(PROMPT §3.12) */
  private renderAchievements(): void {
    const head = document.createElement('div');
    head.className = 'dsh-label';
    head.style.cssText = 'font-size:13px;margin-bottom:10px;';
    const n = ACHIEVEMENTS.filter((a) => this.achievements.isUnlocked(a.id)).length;
    head.innerHTML = `功业簿 · 成就 <span class="dsh-label gold">${n} / ${ACHIEVEMENTS.length}</span>`;
    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
    for (const a of ACHIEVEMENTS) {
      const got = this.achievements.isUnlocked(a.id);
      const row = document.createElement('div');
      row.style.cssText = [
        'display:flex;align-items:center;gap:12px;padding:8px 12px;',
        'border:1px solid', got ? 'rgba(255,212,94,0.55)' : 'rgba(201,162,92,0.18)',
        'border-radius:3px;background:rgba(23,19,14,0.45);',
      ].join(';');
      const seal = document.createElement('div');
      seal.style.cssText = [
        'width:30px;height:30px;flex:0 0 auto;border-radius:3px;display:flex;align-items:center;justify-content:center;',
        'font-size:15px;', got ? 'background:#b03a2e;color:#f0d9c8;' : 'background:rgba(23,19,14,0.8);color:rgba(232,226,211,0.3);',
      ].join(';');
      seal.textContent = got ? '成' : '未';
      const mid = document.createElement('div');
      mid.style.cssText = `flex:1;font-size:13px;color:${got ? '#e8e2d3' : 'rgba(232,226,211,0.4)'};`;
      const name = a.secret && !got ? '???' : a.name;
      const desc = a.secret && !got ? '隐匿的功业,尚待揭晓。' : a.desc;
      mid.innerHTML = `<div>${name}</div><div style="font-size:11px;opacity:0.65;">${desc}</div>`;
      row.append(seal, mid);
      list.append(row);
    }
    this.body.append(head, list);
  }

  /** 设置页(PROMPT §3.15):音量三轨/画质三档/灵敏度 */
  private renderSettings(): void {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:14px;';
    // 音量三轨
    const vols = this.hooks.getVolumes();
    for (const [track, label] of [['master', '主音量'], ['bgm', '乐声'], ['sfx', '音效']] as const) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:12px;';
      const lab = document.createElement('div');
      lab.className = 'dsh-label';
      lab.style.cssText = 'width:70px;font-size:13px;';
      lab.textContent = label;
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '100';
      slider.value = String(Math.round(vols[track] * 100));
      slider.style.cssText = 'flex:1;accent-color:#c9a25c;';
      slider.addEventListener('input', () => {
        this.hooks.onVolumeChange(track, Number(slider.value) / 100);
      });
      row.append(lab, slider);
      wrap.append(row);
    }
    // 画质
    const qRow = document.createElement('div');
    qRow.style.cssText = 'display:flex;align-items:center;gap:12px;';
    const qLab = document.createElement('div');
    qLab.className = 'dsh-label';
    qLab.style.cssText = 'width:70px;font-size:13px;';
    qLab.textContent = '画质';
    const qBtns = document.createElement('div');
    qBtns.style.cssText = 'display:flex;gap:6px;';
    const cur = this.hooks.getQuality();
    for (const q of QUALITY_ORDER) {
      const b = this.actionBtn(QLABEL[q], () => {
        this.hooks.onQualityChange(q);
        this.dirty = true;
      }, q === cur);
      qBtns.append(b);
    }
    qRow.append(qLab, qBtns);
    wrap.append(qRow);
    // 灵敏度
    const sRow = document.createElement('div');
    sRow.style.cssText = 'display:flex;align-items:center;gap:12px;';
    const sLab = document.createElement('div');
    sLab.className = 'dsh-label';
    sLab.style.cssText = 'width:70px;font-size:13px;';
    sLab.textContent = '镜头';
    const sSlider = document.createElement('input');
    sSlider.type = 'range';
    sSlider.min = '20';
    sSlider.max = '200';
    sSlider.value = String(Math.round(this.hooks.getSensitivity() * 100));
    sSlider.style.cssText = 'flex:1;accent-color:#c9a25c;';
    sSlider.addEventListener('input', () => {
      this.hooks.onSensitivityChange(Number(sSlider.value) / 100);
    });
    sRow.append(sLab, sSlider);
    wrap.append(sRow);
    this.body.append(wrap);
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
