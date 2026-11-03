/**
 * 任务定义(数据驱动,PROMPT §3.3)。
 * 文案均为自拟改编(§2.7 IP 合规):骨架取"神农陨落→遗命传人"古神话框架。
 */

export type QuestType = 'main' | 'side';
export type QuestStepType = 'talk' | 'collect' | 'reach' | 'kill' | 'interact' | 'escort' | 'timer';

export interface QuestStep {
  desc: string;
  type: QuestStepType;
  /** 目标 id:npc/dialog/zone/monster/item 依 type 而定 */
  target: string;
  count?: number;
  /** 可选:步骤完成时的旗标 */
  setFlag?: string;
}

export interface QuestDef {
  id: string;
  name: string;
  type: QuestType;
  chapter: string;
  /** 简介与完成语(日志/HUD) */
  summary: string;
  prereq?: string[];
  steps: QuestStep[];
  rewards: { exp?: number; coins?: number; flags?: Record<string, boolean | number> };
}

export const QUESTS: Record<string, QuestDef> = {
  /* ---------- 序章《蛮荒之始》 ---------- */
  q_prologue_1: {
    id: 'q_prologue_1',
    name: '晨课·采药',
    type: 'main',
    chapter: 'prologue',
    summary: '师父要你去谷中采三株青茎芝,少年来到药王谷后的第一个清晨。',
    steps: [
      { desc: '在谷中采集青茎芝', type: 'collect', target: 'herb_qingjingzhi', count: 3 },
      { desc: '把青茎芝交给药翁师父', type: 'talk', target: 'dlg_npc_master' },
    ],
    rewards: { exp: 20, coins: 10, flags: { 'story.met_master': true } },
  },
  q_prologue_battle: {
    id: 'q_prologue_battle',
    name: '谷乱·疫鬼',
    type: 'main',
    chapter: 'prologue',
    summary: '毒雾自池塘边涌起——疫鬼闯入了药王谷,瘴母在其后徘徊。',
    prereq: ['q_prologue_1'],
    steps: [
      { desc: '击退疫鬼', type: 'kill', target: 'yigui', count: 2 },
      { desc: '击败疫鬼·瘴母', type: 'kill', target: 'yigui_boss', count: 1 },
    ],
    rewards: { exp: 50, coins: 25, flags: { 'story.cleared_yigui': true } },
  },
  q_prologue_2: {
    id: 'q_prologue_2',
    name: '噩耗·神农中毒',
    type: 'main',
    chapter: 'prologue',
    summary: '共主神农氏身中旷世奇毒的消息,随着驿马传进了山谷。',
    prereq: ['q_prologue_battle'],
    steps: [
      { desc: '回药庐向师父询问变故', type: 'talk', target: 'dlg_npc_master_2' },
      { desc: '在谷口驿亭听驿卒说详', type: 'talk', target: 'dlg_npc_courier' },
    ],
    rewards: { exp: 30, flags: { 'story.heard_news': true } },
  },

  /* ---------- 第一章《神农遗命》 ---------- */
  q_ch1_1: {
    id: 'q_ch1_1',
    name: '遗命·本草经',
    type: 'main',
    chapter: 'ch1',
    summary: '五族的耳目已至。师父把毕生所托《神农本草经》交给了你。',
    prereq: ['q_prologue_2'],
    steps: [
      { desc: '夜访师父', type: 'talk', target: 'dlg_npc_master_3' },
      { desc: '避开杀手耳目,抵达后山神祠', type: 'reach', target: 'zone_shrine_stealth' },
    ],
    rewards: { exp: 60, coins: 30, flags: { 'story.got_bencao': true } },
  },
};
