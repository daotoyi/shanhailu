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

  /* ---------- 第二章《苗疆结义》 ---------- */
  q_ch2_1: {
    id: 'q_ch2_1',
    name: '九黎·禁地',
    type: 'main',
    chapter: 'ch2',
    summary: '南疆九黎,蚩尤在图腾柱下等你。寨中禁地有傀儡凶兽挡路。',
    prereq: ['q_ch1_1'],
    steps: [
      { desc: '与蚩尤交谈', type: 'talk', target: 'dlg_npc_chiyou' },
      { desc: '清剿禁地傀儡凶兽', type: 'kill', target: 'puppet', count: 3 },
    ],
    rewards: { exp: 200, coins: 60, flags: { 'story.ch2_sworn': true } },
  },

  /* ---------- 第三章《汤谷十日》 ---------- */
  q_ch3_1: {
    id: 'q_ch3_1',
    name: '汤谷·金乌',
    type: 'main',
    chapter: 'ch3',
    summary: '扶桑树上十日并出,大地焦枯。金乌落在了温泉之畔。',
    prereq: ['q_ch2_1'],
    steps: [
      { desc: '击败三足金乌', type: 'kill', target: 'golden_crow', count: 1 },
    ],
    rewards: { exp: 400, coins: 120, flags: { 'story.ch3_crow': true } },
  },

  /* ---------- 第四章《蜃楼迷踪》 ---------- */
  q_ch4_1: {
    id: 'q_ch4_1',
    name: '蜃楼·幻影',
    type: 'main',
    chapter: 'ch4',
    summary: '海市蜃楼中的迷城,雨师妾的笑声在雾里。蜃妖藏在水镜之后。',
    prereq: ['q_ch3_1'],
    steps: [
      { desc: '与雨师妾交谈', type: 'talk', target: 'dlg_npc_yushiqie' },
      { desc: '揭穿并击败蜃妖', type: 'kill', target: 'mirage_demon', count: 1 },
    ],
    rewards: { exp: 480, coins: 140, flags: { 'story.ch4_mirage': true } },
  },

  /* ---------- 第五章《昆仑蟠桃会》 ---------- */
  q_ch5_1: {
    id: 'q_ch5_1',
    name: '昆仑·刺客',
    type: 'main',
    chapter: 'ch5',
    summary: '瑶池蟠桃会群英齐聚,水族的刀藏在庆功酒里。',
    prereq: ['q_ch4_1'],
    steps: [
      { desc: '击败水族刺客', type: 'kill', target: 'water_assassin', count: 1 },
    ],
    rewards: { exp: 560, coins: 160, flags: { 'story.ch5_assassin': true } },
  },

  /* ---------- 第六章《幽都问魂》 ---------- */
  q_ch6_1: {
    id: 'q_ch6_1',
    name: '幽都·问魂',
    type: 'main',
    chapter: 'ch6',
    summary: '为查神农中毒的真相,你踏进幽都鬼界。鬼王拦在奈何之前。',
    prereq: ['q_ch5_1'],
    steps: [
      { desc: '击败幽都鬼王', type: 'kill', target: 'ghost_king', count: 1 },
    ],
    rewards: { exp: 680, coins: 200, flags: { 'story.ch6_ghost': true } },
  },

  /* ---------- 第七章《水妖之乱》 ---------- */
  q_ch7_1: {
    id: 'q_ch7_1',
    name: '水泽·相柳',
    type: 'main',
    chapter: 'ch7',
    summary: '相柳率水妖作乱,九州始涝。九首蛇身,毒涎成泽。',
    prereq: ['q_ch6_1'],
    steps: [
      { desc: '诛杀相柳', type: 'kill', target: 'xiangliu', count: 1 },
    ],
    rewards: { exp: 860, coins: 260, flags: { 'story.ch7_xiangliu': true } },
  },

  /* ---------- 终章《不周天倾》 ---------- */
  q_ch8_1: {
    id: 'q_ch8_1',
    name: '不周·天倾',
    type: 'main',
    chapter: 'ch8',
    summary: '共工败走不周山。他若怒触天柱,天倾地陷,洪水滔天。',
    prereq: ['q_ch7_1'],
    steps: [
      { desc: '与共工对峙', type: 'talk', target: 'dlg_gonggong' },
      { desc: '决战共工', type: 'kill', target: 'gonggong', count: 1 },
    ],
    rewards: { exp: 1200, coins: 400, flags: { 'story.ch8_done': true } },
  },
};
