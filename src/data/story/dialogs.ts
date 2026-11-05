/**
 * 对话总表(数据驱动,PROMPT §3.2)。文案全部自拟改编(§2.7):
 * 骨架取古神话(神农尝百草/赤松子为雨师)框架,不使用受保护小说的人名与原文。
 * 序章与第一章在此;第二~终章见 chapterDialogsEarly.ts / chapterDialogsLate.ts。
 */
import type { DialogTree } from './types.js';
import { EARLY_DIALOGS } from './chapterDialogsEarly.js';
import { LATE_DIALOGS } from './chapterDialogsLate.js';

export type { DialogNode, DialogTree } from './types.js';

const BASE_DIALOGS: Record<string, DialogTree> = {
  /* ---- 药翁师父(晨课) ---- */
  dlg_npc_master: {
    root: 'start',
    nodes: {
      start: {
        speaker: '药翁', portrait: 'master',
        text: '赤松,起得倒早。谷里的青茎芝开得正好,去采三株来,今日教你认药性。',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '师父,今日想先问一味药,还是先问一件谷外的事?',
        choices: [
          { text: '青茎芝性凉,可解春困之毒?', next: 'herb' },
          { text: '昨夜谷口为何有驿马?', next: 'news' },
        ],
      },
      herb: {
        speaker: '药翁', portrait: 'master',
        text: '书没白背。性凉而不寒,入肝经,最宜解春日郁毒。记住:凉药救人,也能伤人。',
        next: 'p3',
      },
      news: {
        speaker: '药翁', portrait: 'master',
        text: '……驿马?这谷里几十年不来急报。先采药,回头为师再与你说。',
        next: 'p3',
      },
      p3: {
        speaker: '药翁', portrait: 'master',
        text: '去吧。若遇上贪嘴的野兔,也别惊了药田;谷东溪畔雾重,脚下留神。',
        next: 'p4',
      },
      p4: {
        speaker: '赤松', portrait: 'player',
        text: '知道了。三株青茎芝,一株不多,一株不少。',
        end: true,
      },
    },
  },
  dlg_npc_master_done: {
    root: 'start',
    nodes: {
      start: {
        speaker: '药翁', portrait: 'master',
        text: '嗯……叶脉青润,根须完好,是好芝。收着吧,今日晨课算你过了。',
        next: 'p2',
      },
      p2: {
        speaker: '药翁', portrait: 'master',
        text: '手艺是慢功夫。天下再乱,会认药的人总还有一口饭吃。',
        end: true,
      },
    },
  },

  /* ---- 驿卒(噩耗) ---- */
  dlg_npc_courier: {
    root: 'start',
    nodes: {
      start: {
        speaker: '驿卒', portrait: 'courier',
        text: '让开让开——!各部急报:共主……共主神农氏,在尝药途中身中奇毒,太医束手!',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '神农共主?!他遍尝百草,怎会……',
        next: 'p3',
      },
      p3: {
        speaker: '驿卒', portrait: 'courier',
        text: '谁知道呢。五族的人已经往这边赶了,说是要「侍疾」。我看哪,是来抢东西的。',
        next: 'p4',
      },
      p4: {
        speaker: '赤松', portrait: 'player',
        text: '我该先问哪一句?',
        choices: [
          { text: '毒有名字吗?', next: 'poison' },
          { text: '来的是哪几族?', next: 'tribes' },
        ],
      },
      poison: {
        speaker: '驿卒', portrait: 'courier',
        text: '急报上只写「旷世奇毒」四个字,连太医都不肯落笔。小哥,这四个字比毒还吓人。',
        next: 'p5',
      },
      tribes: {
        speaker: '驿卒', portrait: 'courier',
        text: '青赤黄白黑的旗都见了,偏偏谁都不肯先到。像约好了似的。',
        next: 'p5',
      },
      p5: {
        speaker: '驿卒', portrait: 'courier',
        text: '我看你面善,听一句劝:这几日,别乱走。',
        next: 'p6',
      },
      p6: {
        speaker: '赤松', portrait: 'player',
        text: '……药庐的灯,该亮到三更了。',
        actions: ['cin:play:cin_prologue_open'],
        end: true,
      },
    },
  },

  /* ---- 夜谈:药翁道出沉渊 ---- */
  dlg_npc_master_2: {
    root: 'start',
    nodes: {
      start: {
        speaker: '药翁', portrait: 'master',
        text: '……都听说了?神农共主中毒,五族齐聚。你可知,五十年前,我曾在神农谷中侍药三月。',
        next: 'p2',
      },
      p2: {
        speaker: '药翁', portrait: 'master',
        text: '那三月里,我见过共主此毒一次——那不是误尝,是有人下的。毒名「沉渊」,水族秘传。',
        next: 'p3',
      },
      p3: {
        speaker: '赤松', portrait: 'player',
        text: '水族?!那我们快去报信——',
        next: 'p4',
      },
      p4: {
        speaker: '药翁', portrait: 'master',
        text: '报信?先报信的人,往往是先被灭口的人。',
        choices: [
          { text: '那就先查毒从何来', next: 'trace' },
          { text: '那就先听谷口的驿马怎么说', next: 'listen' },
        ],
      },
      trace: {
        speaker: '药翁', portrait: 'master',
        text: '沉渊入血脉而不显于色,三日才发。能下这毒的人,必近过共主的药盏。',
        next: 'p5',
      },
      listen: {
        speaker: '药翁', portrait: 'master',
        text: '去谷口驿亭听着。急报里没写出来的那半句,往往在驿卒的抱怨里。',
        next: 'p5',
      },
      p5: {
        speaker: '药翁', portrait: 'master',
        text: '去吧,天黑前回来。今夜为师有话,只说一次。',
        actions: ['cin:play:cin_ch1_open'],
        end: true,
      },
    },
  },

  /* ---- 托付:本草经与神农尺 ---- */
  dlg_npc_master_3: {
    root: 'start',
    nodes: {
      start: {
        speaker: '药翁', portrait: 'master',
        text: '回来了。……孩子,坐。今夜说的话,出了这扇门,你一个字都不能认。',
        next: 'p2',
      },
      p2: {
        speaker: '药翁', portrait: 'master',
        text: '三十年前,神农共主微服至此,在我这药庐住过一夜。他留下一卷手书,说「待天下将倾,托付有缘」。',
        next: 'p3',
      },
      p3: {
        speaker: '药翁', portrait: 'master',
        text: '如今共主中毒,五族逐鹿,天下将倾——这就是了。',
        actions: ['flag:story.book_revealed'],
        next: 'p4',
      },
      p4: {
        speaker: '赤松', portrait: 'player',
        text: '师父,我只会认药。这卷书,该给能平天下的人。',
        choices: [
          { text: '我怕担不起', next: 'fear' },
          { text: '我怕的是有人拿它去害人', next: 'worry' },
        ],
      },
      fear: {
        speaker: '药翁', portrait: 'master',
        text: '共主当年也只说自己是尝草的。担不担得起,走一步才知道。',
        next: 'p5',
      },
      worry: {
        speaker: '药翁', portrait: 'master',
        text: '所以才交给你。会认药的人,分得清哪一味救人、哪一味杀人。',
        next: 'p5',
      },
      p5: {
        speaker: '药翁', portrait: 'master',
        text: '《神农本草经》真本,连同一枚神农尺,我藏在了后山神祠。带上它们,去南边,找九黎的蚩尤。',
        next: 'p6',
      },
      p6: {
        speaker: '药翁', portrait: 'master',
        text: '路上不太平。五族的耳目已经进了谷——避开他们的火把,别回头。',
        actions: ['quest:accept:q_ch1_1'],
        end: true,
      },
    },
  },

  /* ---- 神祠:得书与尺 ---- */
  dlg_shrine_found: {
    root: 'start',
    nodes: {
      start: {
        speaker: '赤松', portrait: 'player',
        text: '神祠……师父的石匣就在香案之下。这一路,居然真的躲过来了。',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '匣里除了书,还有一枚尺。温润得像被人握了许多年。',
        choices: [
          { text: '先翻《本草经》', next: 'book' },
          { text: '先试神农尺', next: 'ruler' },
        ],
      },
      book: {
        speaker: '赤松', portrait: 'player',
        text: '页眉有一行小字:「药无毒不能救人,人无仁不能用药。」是共主的笔迹。',
        next: 'p3',
      },
      ruler: {
        speaker: '赤松', portrait: 'player',
        text: '尺身贴掌,谷里被瘴气灼过的草竟缓缓舒了叶——它认药,也认人气。',
        next: 'p3',
      },
      p3: {
        speaker: '赤松', portrait: 'player',
        text: '《神农本草经》……神农尺。从今日起,这就是我的命了。',
        actions: ['flag:story.got_bencao', 'quest:complete:q_ch1_1'],
        end: true,
      },
    },
  },
};

export const DIALOGS: Record<string, DialogTree> = {
  ...BASE_DIALOGS,
  ...EARLY_DIALOGS,
  ...LATE_DIALOGS,
};
