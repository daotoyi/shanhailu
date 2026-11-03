import type { CombatantStats } from '../combat/Stats.js';
import type { SkillExecutor } from '../combat/SkillExecutor.js';
import { SKILLS, PLAYER_SKILL_SLOTS, PLAYER_ULT } from '../data/skills.js';

/**
 * 战斗 HUD(PROMPT §4.5):左上 头像+血蓝条;右下 技能栏+大招充能;顶部 Boss 血条(阶段刻度)。
 */
export class PlayerHUD {
  private readonly root: HTMLDivElement;
  private readonly hpFill: HTMLDivElement;
  private readonly mpFill: HTMLDivElement;
  private readonly hpText: HTMLDivElement;
  private readonly slots: HTMLDivElement[] = [];
  private readonly slotCds: HTMLDivElement[] = [];
  private readonly slotKeys = ['普', '1', '2', '3'];
  private readonly ultRing: HTMLDivElement;
  private readonly ultText: HTMLDivElement;
  private readonly bossBar: HTMLDivElement;
  private readonly bossFill: HTMLDivElement;
  private readonly bossName: HTMLDivElement;
  private readonly ultFlash: HTMLDivElement;
  private flashT = 0;

  constructor(stage: { append(...nodes: HTMLElement[]): void }) {
    this.root = document.createElement('div');
    this.root.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:55;display:none;';

    /* 左上:头像+血蓝 */
    const tl = document.createElement('div');
    tl.style.cssText = 'position:absolute;left:16px;top:12px;display:flex;gap:10px;align-items:center;';
    const avatar = document.createElement('div');
    avatar.style.cssText = [
      'width:54px;height:54px;border-radius:6px;border:1px solid rgba(201,162,92,0.8);',
      'background:linear-gradient(160deg,#3f6f5f,#17130e);display:flex;align-items:center;justify-content:center;',
      'font-size:26px;color:#e8e2d3;text-shadow:0 1px 3px #000;',
    ].join(';');
    avatar.textContent = '松';
    const bars = document.createElement('div');
    bars.style.cssText = 'display:flex;flex-direction:column;gap:5px;width:220px;';
    const hpBar = document.createElement('div');
    hpBar.style.cssText = 'height:12px;padding:1px;border:1px solid rgba(176,58,46,0.7);background:rgba(23,19,14,0.75);';
    this.hpFill = document.createElement('div');
    this.hpFill.style.cssText = 'height:100%;width:100%;background:linear-gradient(90deg,#8a2a20,#c05a42);';
    const mpBar = document.createElement('div');
    mpBar.style.cssText = 'height:9px;padding:1px;border:1px solid rgba(63,111,143,0.7);background:rgba(23,19,14,0.75);';
    this.mpFill = document.createElement('div');
    this.mpFill.style.cssText = 'height:100%;width:100%;background:linear-gradient(90deg,#2f5a7a,#5f9ab8);';
    this.hpText = document.createElement('div');
    this.hpText.style.cssText = 'font-size:11px;color:#e8e2d3;text-shadow:0 1px 2px #000;margin-top:1px;';
    hpBar.append(this.hpFill);
    mpBar.append(this.mpFill);
    bars.append(hpBar, mpBar, this.hpText);
    tl.append(avatar, bars);

    /* 右下:技能栏 */
    const br = document.createElement('div');
    br.style.cssText = 'position:absolute;right:18px;bottom:14px;display:flex;gap:8px;align-items:flex-end;';
    const mkSlot = (label: string, size: number): HTMLDivElement => {
      const s = document.createElement('div');
      s.style.cssText = [
        `width:${size}px;height:${size}px;border:1px solid rgba(201,162,92,0.75);border-radius:4px;`,
        'background:linear-gradient(180deg,rgba(63,111,95,0.4),rgba(23,19,14,0.9));position:relative;',
        'display:flex;align-items:center;justify-content:center;color:#e8e2d3;',
        `font-size:${size * 0.32}px;text-shadow:0 1px 2px #000;overflow:hidden;`,
      ].join(';');
      const k = document.createElement('div');
      k.style.cssText = 'position:absolute;left:3px;top:1px;font-size:10px;color:#c9a25c;';
      k.textContent = label;
      const cd = document.createElement('div');
      cd.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:0%;background:rgba(10,8,5,0.72);';
      const name = document.createElement('div');
      name.style.cssText = 'position:absolute;bottom:1px;left:0;right:0;text-align:center;font-size:9px;color:rgba(232,226,211,0.75);';
      name.textContent = '';
      s.append(k, cd, name);
      this.slotCds.push(cd);
      return s;
    };
    for (let i = 0; i < 4; i++) {
      const s = mkSlot(this.slotKeys[i]!, i === 0 ? 46 : 52);
      this.slots.push(s);
      br.append(s);
    }
    // 大招(充能环简化为底色填充)
    const ult = mkSlot('大', 62);
    ult.style.borderColor = 'rgba(255,212,94,0.9)';
    this.ultRing = document.createElement('div');
    this.ultRing.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:0%;background:rgba(255,212,94,0.28);';
    this.ultText = document.createElement('div');
    this.ultText.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:15px;color:#ffd45e;';
    this.ultText.textContent = '阵';
    ult.append(this.ultRing, this.ultText);
    br.append(ult);

    /* 顶部 Boss 血条 */
    this.bossBar = document.createElement('div');
    this.bossBar.style.cssText = [
      'position:absolute;left:50%;top:16px;transform:translateX(-50%);width:520px;display:none;',
      'border:1px solid rgba(176,58,46,0.8);padding:2px;background:rgba(23,19,14,0.8);',
    ].join(';');
    this.bossFill = document.createElement('div');
    this.bossFill.style.cssText = 'height:10px;width:100%;background:linear-gradient(90deg,#6a1a12,#b03a2e);position:relative;';
    this.bossName = document.createElement('div');
    this.bossName.style.cssText = 'position:absolute;left:50%;top:-20px;transform:translateX(-50%);font-size:13px;color:#e8b0a0;letter-spacing:4px;white-space:nowrap;text-shadow:0 1px 2px #000;';
    // 阶段刻度
    const tick = document.createElement('div');
    tick.style.cssText = 'position:absolute;left:50%;top:-2px;bottom:-2px;width:1px;background:rgba(232,226,211,0.7);';
    this.bossFill.append(tick);
    this.bossBar.append(this.bossFill, this.bossName);

    /* 大招白闪 */
    this.ultFlash = document.createElement('div');
    this.ultFlash.style.cssText = 'position:absolute;inset:0;background:radial-gradient(circle,rgba(232,240,220,0.85),rgba(168,255,216,0.25) 55%,transparent 75%);opacity:0;z-index:70;';

    this.root.append(tl, br, this.bossBar, this.ultFlash);
    stage.append(this.root);
  }

  show(): void {
    this.root.style.display = 'block';
  }

  update(dt: number, stats: CombatantStats, executor: SkillExecutor, boss: { name: string; hp: number; maxHp: number } | null): void {
    this.hpFill.style.width = `${Math.max(0, stats.hp / stats.block.maxHp) * 100}%`;
    this.mpFill.style.width = `${Math.max(0, stats.mp / stats.block.maxMp) * 100}%`;
    this.hpText.textContent = `${Math.ceil(Math.max(0, stats.hp))} / ${stats.block.maxHp}   灵 ${Math.ceil(stats.mp)}`;
    // 技能槽:名称 + CD 遮罩
    PLAYER_SKILL_SLOTS.forEach((id, i) => {
      const def = SKILLS[id]!;
      const nameEl = this.slots[i + 1]!.children[2] as HTMLDivElement;
      if (nameEl) nameEl.textContent = def.name.slice(0, 2);
      const cdEl = this.slotCds[i + 1]!;
      const cd = executor.getCd(id);
      cdEl.style.height = `${cd > 0 ? (cd / def.cd) * 100 : 0}%`;
    });
    const ultDef = SKILLS[PLAYER_ULT]!;
    const ultName = this.slots[0]!.children[2] as HTMLDivElement;
    if (ultName) ultName.textContent = '';
    const ultCd = this.slotCds[0]!;
    const readyRatio = stats.ultCharge / 100;
    this.ultRing.style.height = `${readyRatio * 100}%`;
    this.ultText.style.opacity = stats.ultCharge >= 100 ? '1' : '0.45';
    void ultCd;
    void ultDef;
    // Boss 条
    if (boss) {
      this.bossBar.style.display = 'block';
      this.bossFill.style.width = `${Math.max(0, boss.hp / boss.maxHp) * 100}%`;
      this.bossName.textContent = boss.name;
    } else {
      this.bossBar.style.display = 'none';
    }
    // 大招白闪衰减
    if (this.flashT > 0) {
      this.flashT -= dt;
      this.ultFlash.style.opacity = String(Math.max(0, this.flashT / 0.5));
    }
  }

  triggerUltFlash(): void {
    this.flashT = 0.5;
  }
}
