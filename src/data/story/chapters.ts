/**
 * 章节剧本总表(内容轮,PROMPT §2.4 / §3.2 / §8.3.1)。
 *
 * 唯一内容来源:章节顺序、任务链、卷首卷末旁白、登场 NPC 与对话映射、运镜 id。
 * 剧情文案全部自拟改编(§2.7):骨架取《山海经》《淮南子》《楚辞》古神话,
 * 不使用受保护小说的人名与原文;新增人物出处见 docs/NAMES.md。
 */

export interface ChapterNpcDef {
  id: string;
  name: string;
  /** 色板 id:PALETTES 的键 */
  palette: string;
  mapId: string;
  pos: [number, number];
  heading: number;
  /** 出现条件:active 任务 id,或 '任务id#步骤序号';省略=本章常驻 */
  when?: string[];
  /** active 任务 → 对话树 id;可带 #步骤序号 优先匹配;'idle' 为闲谈兜底 */
  dialogs: Record<string, string>;
}

export interface ChapterScript {
  key: string;
  label: string;
  title: string;
  mapId: string;
  epigraph: string;
  /** 剧情回顾用:本章梗概 */
  synopsis: string;
  cast: string;
  /** 卷首旁白(进图后串行播报) */
  prologue: string[];
  /** 章末旁白(主线完成后串行播报) */
  epilogue: string[];
  /** 本章主线任务链,按先后顺序 */
  quests: string[];
  banner: string;
  /** 卷首运镜 id(章首引子对话末尾触发) */
  cinOpening?: string;
}

export const CHAPTER_ORDER = [
  'prologue', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8',
] as const;

export type ChapterKey = (typeof CHAPTER_ORDER)[number];

export const CHAPTER_SCRIPTS: Record<ChapterKey, ChapterScript> = {
  prologue: {
    key: 'prologue', label: '序', title: '蛮荒之始',
    mapId: 'yaowang-valley', epigraph: '药香盈谷,神农遗泽',
    synopsis: '药王谷的清晨,学徒赤松随药翁认药采芝。池塘边忽起毒雾,疫鬼现身;驿马随后带来共主神农氏身中奇毒的噩耗。太平日子到此为止。',
    cast: '赤松 · 药翁 · 驿卒',
    prologue: [
      '上古蛮荒,大荒五族并立,共尊炎帝神农氏为天下共主。',
      '药王谷的晨雾里,少年赤松还不知道自己将背负怎样的遗命。',
      '青茎芝正当时,药翁的晨课从三株草药开始。',
      '而谷外,五族的驿马已经踏碎了露水。',
    ],
    epilogue: [
      '噩耗入谷:神农共主尝药中毒,太医束手。',
      '药翁望着南方久久不语——他知道,这毒不是误尝。',
    ],
    quests: ['q_prologue_1', 'q_prologue_battle', 'q_prologue_2'],
    banner: '序章 · 蛮荒之始',
    cinOpening: 'cin_prologue_open',
  },
  ch1: {
    key: 'ch1', label: '壹', title: '神农遗命',
    mapId: 'yaowang-valley', epigraph: '药香盈谷,神农遗泽',
    synopsis: '药翁夜谈,道出五十年前在神农谷见过的「沉渊」之毒。五族缇骑借侍疾之名入谷夺宝,少年避开火把潜至后山神祠,得《神农本草经》真本与神农尺,连夜南行。',
    cast: '赤松 · 药翁 · 五族缇骑',
    prologue: [
      '夜色压谷,药庐的灯亮到三更。',
      '五十年前药翁在神农谷侍药三月,见过一模一样的毒。',
      '毒名沉渊,水族秘传——先报信的人,往往先被灭口。',
      '五族的火把已进了谷口,神祠在后山。',
    ],
    epilogue: [
      '石匣之下,是《神农本草经》真本与一枚温润的神农尺。',
      '「待天下将倾,托付有缘」——三十年前留下这句话的人,早已算到今日。',
      '去南边,找九黎的蚩尤。',
    ],
    quests: ['q_ch1_1'],
    banner: '第一章 · 神农遗命',
    cinOpening: 'cin_ch1_open',
  },
  ch2: {
    key: 'ch2', label: '贰', title: '苗疆结义',
    mapId: 'jiuli-nanjiang', epigraph: '铜鼓声声,苗寨禁地',
    synopsis: '南疆九黎,图腾柱下蚩尤以试刀相迎。禁地傀儡本是木族旧机关,关节处却刻着水族符印——毒害共主的黑手,远不止一族。歃血之后,九黎与少年同担此案。',
    cast: '赤松 · 蚩尤 · 九黎寨众',
    prologue: [
      '铜鼓三响,九黎的寨门为背着一卷破书的外乡人开了。',
      '蚩尤说:想结交,先打架;想结义,先共生死。',
      '禁地里的傀儡已经空转了许多年,关节上却有新刻的符。',
      '南方的风里,有焦土的味道——汤谷的天,不对劲。',
    ],
    epilogue: [
      '傀儡碎处露出一枚水族蛇纹铜钉:沉渊之毒,果然有人递刀。',
      '苗刀与本草经并在一处,蚩尤拍了拍少年的肩:兄弟,往东走。',
    ],
    quests: ['q_ch2_0', 'q_ch2_1'],
    banner: '第二章 · 苗疆结义',
    cinOpening: 'cin_ch2_open',
  },
  ch3: {
    key: 'ch3', label: '叁', title: '汤谷十日',
    mapId: 'tanggu', epigraph: '十日并出,扶桑燎天',
    synopsis: '扶桑神树上十日并出,东海焦枯,流民载道。羿在温泉之畔张弓,却迟迟不射——金乌身上缠着水族借天灾调兵的密令。射日弓落下,第一只金乌坠地。',
    cast: '赤松 · 羿 · 三足金乌',
    prologue: [
      '汤谷的水沸了,扶桑树的叶子卷成了焦炭色。',
      '天上十日并出,地上禾木俱焚,流民沿着干涸的河床往西走。',
      '羿倚着扶桑树根,弓弦上搭着一支没有箭羽的箭。',
      '他说:金乌不是自己飞出来的,是有人把它们赶上了天。',
    ],
    epilogue: [
      '一羽落,天光暗了一分;焦土上第一次有了影子。',
      '金乌翅骨里藏着水族的调兵符:十日之灾,是遮人耳目的烟。',
    ],
    quests: ['q_ch3_0', 'q_ch3_1'],
    banner: '第三章 · 汤谷十日',
    cinOpening: 'cin_ch3_open',
  },
  ch4: {
    key: 'ch4', label: '肆', title: '蜃楼迷踪',
    mapId: 'shenlou-city', epigraph: '海市蜃楼,镜花水月',
    synopsis: '海市蜃楼里的城,街道会随人的念头改向。雨师妾在水镜后笑,蜃妖偏挑共工的模样作幻影。破镜之后她才吐出半句真话:沉渊之毒,須昆仑蟠桃核与幽都还魂草两味引子。',
    cast: '赤松 · 雨师妾 · 蜃妖',
    prologue: [
      '海雾一起,蜃楼城的巷子就换了方向。',
      '你踩着的也许不是街道,是谁的一面水镜。',
      '雨师妾坐在幻塔阶上,笑得亦正亦邪:小神医,你猜哪个我才是真的?',
      '水镜深处,有个影子学着共工的样子抬起了头。',
    ],
    epilogue: [
      '镜碎,蜃妖化作一地咸水;雨师妾的笑声却还在雾里。',
      '「解沉渊,要昆仑蟠桃的核,和幽都的还魂草。」她说完就走了。',
    ],
    quests: ['q_ch4_0', 'q_ch4_1'],
    banner: '第四章 · 蜃楼迷踪',
    cinOpening: 'cin_ch4_open',
  },
  ch5: {
    key: 'ch5', label: '伍', title: '昆仑蟠桃会',
    mapId: 'kunlun', epigraph: '雪岭瑶池,蟠桃盛会',
    synopsis: '瑶池蟠桃会,五族高手车轮较技。瑶姬替少年挡下一盏庆功酒——酒里是水族的调包药。刺客败露,供出一道假诏:五族内有人借颛顼之名,把共主引上了尝药的路。',
    cast: '赤松 · 瑶姬 · 西王母座下 · 水族刺客',
    prologue: [
      '昆仑雪线之上,瑶池的蟠桃三千年一熟。',
      '五族的车轮比试从清晨排到日暮,酒盏传了一轮又一轮。',
      '瑶姬拦下少年手里的那盏:这一杯,换我替你饮。',
      '蟠桃核是解沉渊的第一味引子,而有人不想让它离山。',
    ],
    epilogue: [
      '刺客袖中掉出一卷假诏,落款竟是颛顼。',
      '五族里有人借神名传诏,把共主一步步引向了那株毒草。',
      '瑶姬把蟠桃核放进少年掌心:剩下的那一味,在幽都。',
    ],
    quests: ['q_ch5_0', 'q_ch5_1'],
    banner: '第五章 · 昆仑蟠桃会',
    cinOpening: 'cin_ch5_open',
  },
  ch6: {
    key: 'ch6', label: '陆', title: '幽都问魂',
    mapId: 'youdu', epigraph: '魂归幽都,鬼火引路',
    synopsis: '鬼门之后,灵山十巫之一的巫咸守着还魂草。少年以神农尺问魂,见到的却不是完整的真相:毒是水族所下,递刀的有五族的人,而下令的那道假诏,出自共工案头。',
    cast: '赤松 · 巫咸 · 宵明之魂 · 鬼王',
    prologue: [
      '幽都无日,鬼火沿着奈何两岸一盏盏亮起来。',
      '十巫守着灵山传下的还魂草,不轻易给活人。',
      '神农尺贴地,香灰里浮起一个熟悉的少女名字——宵明。',
      '问魂要付代价:真相从不肯只露出一张脸。',
    ],
    epilogue: [
      '魂影散去,留下三句话:毒出水族,刀过五族,诏自不周。',
      '还魂草到手,两味引子齐了;可解药要救的人,已经不在了。',
      '鬼门在身后合拢,远处水声大作——九州始涝。',
    ],
    quests: ['q_ch6_0', 'q_ch6_1'],
    banner: '第六章 · 幽都问魂',
    cinOpening: 'cin_ch6_open',
  },
  ch7: {
    key: 'ch7', label: '柒', title: '水妖之乱',
    mapId: 'shuize', epigraph: '九州始涝,蛇泽千里',
    synopsis: '相柳九首搅动大荒水泽,毒涎成泽,九州始涝。泽叟领着流民退上栈道。九首一一垂下时,相柳吐出最后一句:共工已去不周山,天柱折与不折,只在他一念之间。',
    cast: '赤松 · 泽叟 · 相柳 · 水泽流民',
    prologue: [
      '水漫过了田垄,又漫过了屋脊;泽国的路只剩一条栈道。',
      '相柳九首轮番抬头,毒涎落处,草木当场枯成灰白。',
      '泽叟把最后一批流民推上高处的木架:神医,先救人,再杀蛇。',
      '九个头,九条命;每斩一首,水就退一寸。',
    ],
    epilogue: [
      '第九首沉入泽底,水位开始回落。',
      '「共工已上不周山。」相柳的尾音散在泥水里,「他若回头,天就塌了。」',
      '少年把解药收进怀里,转身向北。',
    ],
    quests: ['q_ch7_0', 'q_ch7_1'],
    banner: '第七章 · 水妖之乱',
    cinOpening: 'cin_ch7_open',
  },
  ch8: {
    key: 'ch8', label: '终', title: '不周天倾',
    mapId: 'buzhou', epigraph: '天柱倾斜,洪波将起',
    synopsis: '不周山断柱之下,共工把假诏、五族的倾轧、毒杀共主的账一并摊开。决战三度变招,他终究回身撞向天柱。天倾西北,水潦尘埃归东南;少年握紧神农尺,站进风雨里。',
    cast: '赤松 · 共工',
    prologue: [
      '不周山的断柱直插云里,柱身上尽是旧年雷火灼出的裂痕。',
      '共工站在柱影下,没有回头:你们正道,哪一样干净?',
      '假诏、内鬼、沉渊——所有线头,今日都收在这一处。',
      '风从西北来,天光低得反常。',
    ],
    epilogue: [
      '共工败退,却猛然回身,用尽全力撞向不周山。',
      '天柱折,地维绝。天倾西北,洪水滔天而来。',
      '女娲氏的传说里,天是可以补的。(续章·未完)',
    ],
    quests: ['q_ch8_0', 'q_ch8_1'],
    banner: '终章 · 不周天倾',
    cinOpening: 'cin_ch8_open',
  },
};

export const ALL_CHAPTER_NPCS: ChapterNpcDef[] = [
  {
    id: 'npc_master', name: '药翁', palette: 'apprentice',
    mapId: 'yaowang-valley', pos: [-14, -14.5], heading: 0.9,
    dialogs: {
      'q_prologue_1': 'dlg_npc_master',
      'q_prologue_1#1': 'dlg_npc_master_done',
      'q_prologue_2#0': 'dlg_npc_master_2',
      'q_ch1_1': 'dlg_npc_master_3',
      idle: 'dlg_npc_master_done',
    },
  },
  {
    id: 'npc_courier', name: '驿卒', palette: 'apprentice',
    mapId: 'yaowang-valley', pos: [16, -4], heading: -1.2,
    when: ['q_prologue_2'],
    dialogs: { 'q_prologue_2': 'dlg_npc_courier', idle: 'dlg_npc_courier' },
  },
  {
    id: 'npc_chiyou', name: '蚩尤', palette: 'miao',
    mapId: 'jiuli-nanjiang', pos: [-3, -8], heading: 2.6,
    dialogs: {
      'q_ch2_0': 'dlg_ch2_intro',
      'q_ch2_1#0': 'dlg_ch2_clash',
      idle: 'dlg_npc_chiyou_done',
    },
  },
  {
    id: 'npc_houyi', name: '羿', palette: 'apprentice',
    mapId: 'tanggu', pos: [3, 26], heading: 3.0,
    dialogs: { 'q_ch3_0': 'dlg_ch3_intro', idle: 'dlg_ch3_after' },
  },
  {
    id: 'npc_yushiqie', name: '雨师妾', palette: 'shui',
    mapId: 'shenlou-city', pos: [4, -10], heading: 0.4,
    dialogs: {
      'q_ch4_0': 'dlg_ch4_intro',
      'q_ch4_1#0': 'dlg_ch4_clash',
      idle: 'dlg_npc_yushiqie_2',
    },
  },
  {
    id: 'npc_yaoji', name: '瑶姬', palette: 'apprentice',
    mapId: 'kunlun', pos: [3, 26], heading: 3.0,
    dialogs: { 'q_ch5_0': 'dlg_ch5_intro', idle: 'dlg_ch5_after' },
  },
  {
    id: 'npc_wuxian', name: '巫咸', palette: 'shui',
    mapId: 'youdu', pos: [3, 24], heading: 3.0,
    dialogs: { 'q_ch6_0': 'dlg_ch6_intro', idle: 'dlg_ch6_after' },
  },
  {
    id: 'npc_zesou', name: '泽叟', palette: 'apprentice',
    mapId: 'shuize', pos: [3, 28], heading: 3.0,
    dialogs: { 'q_ch7_0': 'dlg_ch7_intro', idle: 'dlg_ch7_after' },
  },
  {
    id: 'npc_gonggong', name: '共工', palette: 'shui',
    mapId: 'buzhou', pos: [0, -26], heading: 3.4,
    when: ['q_ch8_0', 'q_ch8_1#0'],
    dialogs: { 'q_ch8_0': 'dlg_ch8_intro', 'q_ch8_1#0': 'dlg_gonggong', idle: 'dlg_gonggong' },
  },
];

export function chapterByKey(key: string): ChapterScript | undefined {
  return (CHAPTER_SCRIPTS as Record<string, ChapterScript>)[key];
}

export function chapterByQuest(questId: string): ChapterScript | undefined {
  return CHAPTER_ORDER.map((k) => CHAPTER_SCRIPTS[k]).find((s) => s.quests.includes(questId));
}

export function chapterByMap(mapId: string): ChapterScript | undefined {
  return CHAPTER_ORDER.map((k) => CHAPTER_SCRIPTS[k]).find((s) => s.mapId === mapId);
}

export function npcsForChapter(key: string): ChapterNpcDef[] {
  return ALL_CHAPTER_NPCS.filter((n) => n.mapId === chapterByKey(key)?.mapId);
}

export function npcById(id: string): ChapterNpcDef | undefined {
  return ALL_CHAPTER_NPCS.find((n) => n.id === id);
}
