import type { EventBus } from '../core/events.js';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  /** 隐藏成就显示为 ??? */
  secret?: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_kill', name: '初试锋芒', desc: '击败第一只敌人' },
  { id: 'kills_50', name: '身经百战', desc: '累计击败 50 只敌人' },
  { id: 'sworn', name: '苗疆结义', desc: '与蚩尤歃血为盟' },
  { id: 'crow_slayer', name: '射日者', desc: '斩落三足金乌', secret: true },
  { id: 'first_beast', name: '初契灵兽', desc: '首次契约山海异兽' },
  { id: 'rider', name: '纵马大荒', desc: '骑乘神兽奔驰' },
  { id: 'lianqi', name: '踏入炼气', desc: '突破至炼气境界' },
  { id: 'zhenqi', name: '真气激荡', desc: '突破至真气境界' },
  { id: 'rich', name: '囊中殷实', desc: '持有贝币达 500' },
  { id: 'brewer', name: '炼药上手', desc: '炼药等级达到 3' },
  { id: 'savior', name: '不周之巅', desc: '见证不周天倾(通关)', secret: true },
];

/**
 * 成就系统(PROMPT §3.12):事件驱动,达成即横幅;记录入档。
 */
export class Achievements {
  private unlocked = new Set<string>();
  private kills = 0;
  private banner: (text: string) => void = () => {};

  constructor(private readonly bus: EventBus) {
    bus.on('quest:kill', () => {
      this.kills++;
      this.unlock('first_kill');
      if (this.kills >= 50) this.unlock('kills_50');
    });
    bus.on('quest:completed', ({ id }) => {
      if (id === 'q_ch2_1') this.unlock('sworn');
      if (id === 'q_ch3_1') this.unlock('crow_slayer');
      if (id === 'q_ch8_1') this.unlock('savior');
    });
    bus.on('beast:caught', () => this.unlock('first_beast'));
    bus.on('beast:ride', ({ riding }) => {
      if (riding) this.unlock('rider');
    });
    bus.on('prog:breakthrough', ({ realm }) => {
      if (realm === '炼气') this.unlock('lianqi');
      if (realm === '真气') this.unlock('zhenqi');
    });
  }

  setBanner(fn: (text: string) => void): void {
    this.banner = fn;
  }

  checkRich(coins: number): void {
    if (coins >= 500) this.unlock('rich');
  }

  checkAlchemy(level: number): void {
    if (level >= 3) this.unlock('brewer');
  }

  private unlock(id: string): void {
    if (this.unlocked.has(id)) return;
    this.unlocked.add(id);
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (def) this.banner(`成就达成 · ${def.name}`);
    this.bus.emit('achievement:unlocked', { id });
  }

  isUnlocked(id: string): boolean {
    return this.unlocked.has(id);
  }

  serialize(): { unlocked: string[]; kills: number } {
    return { unlocked: [...this.unlocked], kills: this.kills };
  }

  deserialize(data: { unlocked?: string[]; kills?: number }): void {
    this.unlocked = new Set(data.unlocked ?? []);
    this.kills = data.kills ?? 0;
  }
}
