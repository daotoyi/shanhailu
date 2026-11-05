/**
 * 运镜过场总表(数据驱动,PROMPT §3.2)。
 * cin_opening / cin_ch1_end / cin_ending 为原有主线过场;
 * cin_*_open 为九章卷首运镜,由各章引子对话末尾的 cin:play:<id> 触发,可空格跳过。
 * 章节图同构(地标多在 z≈-30),卷首机位采用通用远景 → 推近,避免逐图调相机。
 */
import type { CinematicDef } from '../../render/Cinematic.js';

/** 七章主题图通用卷首机位(序/壹另用药王谷机位) */
const openShot = (id: string, lines: [string, string, string]): CinematicDef => ({
  id,
  keyframes: [
    { pos: [0, 15, 34], lookAt: [0, 6, -14], dur: 4.5 },
    { pos: [-16, 9, 8], lookAt: [0, 9, -30], dur: 5.5, ease: 'inout' },
  ],
  subtitles: [
    { at: 0.5, dur: 3.0, text: lines[0] },
    { at: 3.6, dur: 3.0, text: lines[1] },
    { at: 6.7, dur: 3.0, text: lines[2] },
  ],
});

export const CINEMATICS: Record<string, CinematicDef> = {
  /* ---------- 原有主线过场 ---------- */
  cin_opening: {
    id: 'cin_opening',
    keyframes: [
      { pos: [-34, 24, 26], lookAt: [0, 3, 0], dur: 5.0 },
      { pos: [-10, 9, -8], lookAt: [0, 2, -16], dur: 4.5 },
      { pos: [3.4, 2.6, -11.5], lookAt: [0, 1.6, -16], dur: 3.2, ease: 'inout' },
    ],
    subtitles: [
      { at: 0.6, dur: 4.0, text: '上古蛮荒,大荒五族并立,共尊炎帝神农氏为天下共主。' },
      { at: 5.2, dur: 3.6, text: '药王谷的晨雾里,少年还不知道自己将背负怎样的遗命……' },
    ],
    onEndActions: ['quest:accept:q_prologue_1'],
  },
  cin_ch1_end: {
    id: 'cin_ch1_end',
    keyframes: [
      { pos: [8, 4.2, -22], lookAt: [0, 2.5, -30], dur: 4.0 },
      { pos: [-6, 5.5, -38], lookAt: [0, 3, -30], dur: 4.5, ease: 'inout' },
    ],
    subtitles: [
      { at: 0.4, dur: 3.4, text: '香火明灭处,少年把《神农本草经》贴身收好。' },
      { at: 4.2, dur: 3.8, text: '南方,九黎的山影在夜色里起伏——蚩尤还在那里等他。' },
    ],
    onEndActions: ['flag:story.ch1_done'],
  },
  cin_ending: {
    id: 'cin_ending',
    keyframes: [
      { pos: [16, 6, -18], lookAt: [-6, 20, -40], dur: 5.0 },
      { pos: [2, 3.4, -24], lookAt: [-6, 24, -40], dur: 4.6, ease: 'inout' },
      { pos: [-10, 10, -34], lookAt: [-30, 6, -10], dur: 5.0 },
    ],
    subtitles: [
      { at: 0.5, dur: 3.6, text: '共工败退,却猛然回身,用尽全力撞向不周山——' },
      { at: 4.6, dur: 3.6, text: '天柱折,地维绝。天倾西北,水潦尘埃归东南。' },
      { at: 8.8, dur: 3.8, text: '洪水滔天而来。少年握紧神农尺,站进了风雨里。(续章·未完)' },
    ],
    onEndActions: ['flag:story.ending_seen'],
  },

  /* ---------- 九章卷首运镜 ---------- */
  cin_prologue_open: openShot('cin_prologue_open', [
    '驿马踏碎了谷口的露水,急报一路传进药庐。',
    '共主神农氏尝药中毒,太医束手;五族已动。',
    '药翁望着南方,把灯芯剪短了一截。',
  ]),
  cin_ch1_open: openShot('cin_ch1_open', [
    '入夜,五族的火把沿着谷道次第亮起。',
    '他们口称侍疾,眼睛却只往药庐后山看。',
    '神祠的香火还在,石匣就在香案之下。',
  ]),
  cin_ch2_open: openShot('cin_ch2_open', [
    '铜鼓三响,图腾柱的影子压过整座苗寨。',
    '禁地的石门缓缓错开,傀儡的关节发出空转多年的声响。',
    '南方天际泛着不正常的焦红——那是汤谷的方向。',
  ]),
  cin_ch3_open: openShot('cin_ch3_open', [
    '扶桑神树的枝头悬着十日,叶缘卷成焦炭色。',
    '干涸的河床上,流民背着陶罐往西走。',
    '羿抬起弓,第一支箭没有箭羽。',
  ]),
  cin_ch4_open: openShot('cin_ch4_open', [
    '海雾涨起,蜃楼城的巷子在雾里改了方向。',
    '幻塔的每一层水镜都映出一个不同的你。',
    '最深的那面镜后,有个影子学着共工抬起了头。',
  ]),
  cin_ch5_open: openShot('cin_ch5_open', [
    '昆仑雪线之上,瑶池的蟠桃三千年一熟。',
    '五族的车轮比试排到日暮,酒盏传了一轮又一轮。',
    '有一只袖口绣着鲛纹的手,正把壶换过去。',
  ]),
  cin_ch6_open: openShot('cin_ch6_open', [
    '幽都无日,鬼火沿着奈何两岸一盏盏亮起。',
    '灵山十巫守着还魂草,草叶上凝着不属于人间的露。',
    '香灰浮起一个名字:宵明。她的灯还没灭。',
  ]),
  cin_ch7_open: openShot('cin_ch7_open', [
    '水漫过田垄,又漫过屋脊;泽国的路只剩一条栈道。',
    '相柳九首轮番抬头,毒涎落处草木枯成灰白。',
    '九个头,九条命;每斩一首,水退一寸。',
  ]),
  cin_ch8_open: openShot('cin_ch8_open', [
    '不周山的断柱直插云里,柱身尽是旧年雷火的裂痕。',
    '共工站在柱影下,没有回头。',
    '风从西北来,天光低得反常。',
  ]),
};
