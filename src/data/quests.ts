/**
 * 任务定义(数据驱动,PROMPT §3.3 / §8.3.1 内容轮)。
 * 文案均为自拟改编(§2.7 IP 合规):骨架取「神农陨落→遗命传人」古神话框架。
 * 每章结构:引子任务(与本章引路人交谈)→ 决战任务;章节流转见 data/story/chapters.ts。
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
    summary: '药王谷的晨雾还没散,药翁支起药匾,要你去谷中采三株青茎芝。少年认得药性,却还不认得世道。',
    steps: [
      { desc: '在谷中采三株带露的青茎芝', type: 'collect', target: 'herb_qingjingzhi', count: 3 },
      { desc: '回药庐,把芝草交给药翁', type: 'talk', target: 'dlg_npc_master' },
    ],
    rewards: { exp: 20, coins: 10, flags: { 'story.met_master': true } },
  },
  q_prologue_battle: {
    id: 'q_prologue_battle',
    name: '谷乱·疫鬼',
    type: 'main',
    chapter: 'prologue',
    summary: '池塘边忽起毒雾,疫鬼踏着瘴气闯进药田。药翁把药锄塞进你手里:先护住谷里的人。',
    prereq: ['q_prologue_1'],
    steps: [
      { desc: '击退闯入药田的疫鬼', type: 'kill', target: 'yigui', count: 2 },
      { desc: '击败池塘之畔的疫鬼·瘴母', type: 'kill', target: 'yigui_boss', count: 1 },
    ],
    rewards: { exp: 50, coins: 25, flags: { 'story.cleared_yigui': true } },
  },
  q_prologue_2: {
    id: 'q_prologue_2',
    name: '噩耗·神农中毒',
    type: 'main',
    chapter: 'prologue',
    summary: '驿马踏碎露水,急报传进山谷:共主神农氏身中旷世奇毒。五族的旗,已经往这边来了。',
    prereq: ['q_prologue_battle'],
    steps: [
      { desc: '夜访药庐,问师父这毒的来历', type: 'talk', target: 'dlg_npc_master_2' },
      { desc: '去谷口驿亭,听驿卒说急报里没写的半句', type: 'talk', target: 'dlg_npc_courier' },
    ],
    rewards: { exp: 30, flags: { 'story.heard_news': true } },
  },

  /* ---------- 第一章《神农遗命》 ---------- */
  q_ch1_1: {
    id: 'q_ch1_1',
    name: '遗命·本草经',
    type: 'main',
    chapter: 'ch1',
    summary: '药翁道出「沉渊」旧事,把共主三十年前留下的手书托付给你。五族耳目已入谷,神祠在后山。',
    prereq: ['q_prologue_2'],
    steps: [
      { desc: '夜访师父,听他说出那卷手书', type: 'talk', target: 'dlg_npc_master_3' },
      { desc: '避开缇骑火把与视线,潜至后山神祠', type: 'reach', target: 'zone_shrine_stealth' },
    ],
    rewards: { exp: 60, coins: 30, flags: { 'story.got_bencao': true } },
  },

  /* ---------- 第二章《苗疆结义》 ---------- */
  q_ch2_0: {
    id: 'q_ch2_0',
    name: '九黎·铜鼓三响',
    type: 'main',
    chapter: 'ch2',
    summary: '南疆九黎,图腾柱下的少年战神蚩尤要看看,背着神农尺的外乡人值不值得一起喝酒。',
    prereq: ['q_ch1_1'],
    steps: [
      { desc: '在寨门图腾柱下与蚩尤交谈', type: 'talk', target: 'dlg_ch2_intro' },
    ],
    rewards: { exp: 60, coins: 20, flags: { 'story.ch2_met': true } },
  },
  q_ch2_1: {
    id: 'q_ch2_1',
    name: '九黎·禁地',
    type: 'main',
    chapter: 'ch2',
    summary: '禁地傀儡本是木族旧机关,关节处却新刻了水族蛇纹铜钉。拆了它,歃血结义。',
    prereq: ['q_ch2_0'],
    steps: [
      { desc: '听蚩尤说破禁地里的名堂', type: 'talk', target: 'dlg_ch2_clash' },
      { desc: '清剿禁地傀儡凶兽', type: 'kill', target: 'puppet', count: 3 },
    ],
    rewards: { exp: 200, coins: 60, flags: { 'story.ch2_sworn': true } },
  },

  /* ---------- 第三章《汤谷十日》 ---------- */
  q_ch3_0: {
    id: 'q_ch3_0',
    name: '汤谷·扶桑待箭',
    type: 'main',
    chapter: 'ch3',
    summary: '扶桑神树上十日并出,东海焦枯。羿倚着树根,弓弦上那支箭已经搭了三日。',
    prereq: ['q_ch2_1'],
    steps: [
      { desc: '在扶桑树下与羿交谈,问他为何不射', type: 'talk', target: 'dlg_ch3_intro' },
    ],
    rewards: { exp: 90, coins: 30, flags: { 'story.ch3_met': true } },
  },
  q_ch3_1: {
    id: 'q_ch3_1',
    name: '汤谷·金乌',
    type: 'main',
    chapter: 'ch3',
    summary: '第一只三足金乌落在温泉之畔,翅骨里藏着水族的调兵符。射日弓落下,天光才暗了一分。',
    prereq: ['q_ch3_0'],
    steps: [
      { desc: '击败温泉之畔的三足金乌', type: 'kill', target: 'golden_crow', count: 1 },
    ],
    rewards: { exp: 400, coins: 120, flags: { 'story.ch3_crow': true } },
  },

  /* ---------- 第四章《蜃楼迷踪》 ---------- */
  q_ch4_0: {
    id: 'q_ch4_0',
    name: '蜃楼·水镜问路',
    type: 'main',
    chapter: 'ch4',
    summary: '海雾一起,蜃楼城的巷子就换了方向。雨师妾坐在幻塔阶上,笑问你踩的是街道还是她的水镜。',
    prereq: ['q_ch3_1'],
    steps: [
      { desc: '在幻塔阶前与雨师妾交谈', type: 'talk', target: 'dlg_ch4_intro' },
    ],
    rewards: { exp: 110, coins: 35, flags: { 'story.ch4_met': true } },
  },
  q_ch4_1: {
    id: 'q_ch4_1',
    name: '蜃楼·幻影',
    type: 'main',
    chapter: 'ch4',
    summary: '水镜后有九个你,只有一个真。蜃妖偏挑共工的模样作幻影——因为它见过那道假诏。',
    prereq: ['q_ch4_0'],
    steps: [
      { desc: '听雨师妾说破辨影之法', type: 'talk', target: 'dlg_ch4_clash' },
      { desc: '揭穿并击败蜃妖', type: 'kill', target: 'mirage_demon', count: 1 },
    ],
    rewards: { exp: 480, coins: 140, flags: { 'story.ch4_mirage': true } },
  },

  /* ---------- 第五章《昆仑蟠桃会》 ---------- */
  q_ch5_0: {
    id: 'q_ch5_0',
    name: '昆仑·一盏庆功酒',
    type: 'main',
    chapter: 'ch5',
    summary: '瑶池蟠桃会,五族车轮较技,酒盏传了一轮又一轮。瑶姬伸手拦下了递给你的那一盏。',
    prereq: ['q_ch4_1'],
    steps: [
      { desc: '在瑶池席间与瑶姬交谈', type: 'talk', target: 'dlg_ch5_intro' },
    ],
    rewards: { exp: 130, coins: 40, flags: { 'story.ch5_met': true } },
  },
  q_ch5_1: {
    id: 'q_ch5_1',
    name: '昆仑·刺客',
    type: 'main',
    chapter: 'ch5',
    summary: '蟠桃核是解沉渊的第一味引子,有人不想让它离山。水族的刀,藏在庆功酒里。',
    prereq: ['q_ch5_0'],
    steps: [
      { desc: '击败现形的水族刺客', type: 'kill', target: 'water_assassin', count: 1 },
    ],
    rewards: { exp: 560, coins: 160, flags: { 'story.ch5_assassin': true } },
  },

  /* ---------- 第六章《幽都问魂》 ---------- */
  q_ch6_0: {
    id: 'q_ch6_0',
    name: '幽都·鬼火引路',
    type: 'main',
    chapter: 'ch6',
    summary: '幽都无日,鬼火沿奈何两岸一盏盏亮起。灵山十巫之一的巫咸守着还魂草,不轻易给活人。',
    prereq: ['q_ch5_1'],
    steps: [
      { desc: '在鬼门前与巫咸交谈,问明问魂的代价', type: 'talk', target: 'dlg_ch6_intro' },
    ],
    rewards: { exp: 150, coins: 45, flags: { 'story.ch6_met': true } },
  },
  q_ch6_1: {
    id: 'q_ch6_1',
    name: '幽都·问魂',
    type: 'main',
    chapter: 'ch6',
    summary: '神农尺贴地,香灰里浮起宵明的名字。鬼王守在桥前不肯放灯过去——破了他,草与话都给你。',
    prereq: ['q_ch6_0'],
    steps: [
      { desc: '击败奈何桥前的幽都鬼王', type: 'kill', target: 'ghost_king', count: 1 },
    ],
    rewards: { exp: 680, coins: 200, flags: { 'story.ch6_ghost': true } },
  },

  /* ---------- 第七章《水妖之乱》 ---------- */
  q_ch7_0: {
    id: 'q_ch7_0',
    name: '水泽·栈道流民',
    type: 'main',
    chapter: 'ch7',
    summary: '水漫过屋脊,泽国的路只剩一条栈道。泽叟把最后一批流民推上高处的木架:先救人,再杀蛇。',
    prereq: ['q_ch6_1'],
    steps: [
      { desc: '在栈道尽头与泽叟交谈', type: 'talk', target: 'dlg_ch7_intro' },
    ],
    rewards: { exp: 180, coins: 50, flags: { 'story.ch7_met': true } },
  },
  q_ch7_1: {
    id: 'q_ch7_1',
    name: '水泽·相柳',
    type: 'main',
    chapter: 'ch7',
    summary: '相柳九首轮番抬头,毒涎成泽,九州始涝。九个头,九条命;每斩一首,水退一寸。',
    prereq: ['q_ch7_0'],
    steps: [
      { desc: '诛杀九首相柳', type: 'kill', target: 'xiangliu', count: 1 },
    ],
    rewards: { exp: 860, coins: 260, flags: { 'story.ch7_xiangliu': true } },
  },

  /* ---------- 终章《不周天倾》 ---------- */
  q_ch8_0: {
    id: 'q_ch8_0',
    name: '不周·柱影旧账',
    type: 'main',
    chapter: 'ch8',
    summary: '断柱之下,共工把假诏、五族的倾轧、毒杀共主的账一并摊开:你们正道,哪一样干净?',
    prereq: ['q_ch7_1'],
    steps: [
      { desc: '在断柱柱影下与共工对谈', type: 'talk', target: 'dlg_ch8_intro' },
    ],
    rewards: { exp: 200, coins: 60, flags: { 'story.ch8_met': true } },
  },
  q_ch8_1: {
    id: 'q_ch8_1',
    name: '不周·天倾',
    type: 'main',
    chapter: 'ch8',
    summary: '决战三度变招,共工败退却回身撞向天柱。天倾西北,洪水滔天——他若回头,天就塌了。',
    prereq: ['q_ch8_0'],
    steps: [
      { desc: '与共工最后对峙', type: 'talk', target: 'dlg_gonggong' },
      { desc: '决战共工', type: 'kill', target: 'gonggong', count: 1 },
    ],
    rewards: { exp: 1200, coins: 400, flags: { 'story.ch8_done': true } },
  },
};
