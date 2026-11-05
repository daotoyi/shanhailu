/**
 * 第五~终章对话(内容轮)。文案自拟改编,古神话出处见 docs/NAMES.md。
 * 主线骨架:神农陨落 → 五族夺权 → 水妖之乱 → 不周天倾,不改动。
 */
import type { DialogTree } from './types.js';

export const LATE_DIALOGS: Record<string, DialogTree> = {
  /* ================= 第五章 昆仑蟠桃会 ================= */
  dlg_ch5_intro: {
    root: 'start',
    nodes: {
      start: {
        speaker: '瑶姬', portrait: 'yaoji',
        text: '雪线之上风硬,先把这一盏放下。',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '庆功酒?蟠桃会才过第二轮,五族的车轮比试还没收场。',
        next: 'p3',
      },
      p3: {
        speaker: '瑶姬', portrait: 'yaoji',
        text: '正是「才过第二轮」,酒盏才传得这样勤。你猜壶里换过几回?',
        choices: [
          { text: '我先闻药性', next: 'smell' },
          { text: '我先问谁斟的酒', next: 'ask' },
        ],
      },
      smell: {
        speaker: '赤松', portrait: 'player',
        text: '酒气里压着一味沉水的苦——和沉渊之毒同源。',
        next: 'p4',
      },
      ask: {
        speaker: '瑶姬', portrait: 'yaoji',
        text: '斟酒的小侍从今晨才补进瑶池,来历写着木族,袖口却是水族的鲛纹。',
        next: 'p4',
      },
      p4: {
        speaker: '瑶姬', portrait: 'yaoji',
        text: '这一杯,换我替你饮。蟠桃核是解沉渊的第一味引子,有人不想让它离山。',
        next: 'p5',
      },
      p5: {
        speaker: '赤松', portrait: 'player',
        text: '瑶姬姑娘何必替一个外乡人挡酒。',
        next: 'p6',
      },
      p6: {
        speaker: '瑶姬', portrait: 'yaoji',
        text: '我父亲生前常说:医者手里那味药,救的从来不止一个人。去吧,别让刺客先出瑶池。',
        actions: ['cin:play:cin_ch5_open'],
        end: true,
      },
    },
  },
  dlg_ch5_after: {
    root: 'start',
    nodes: {
      start: {
        speaker: '瑶姬', portrait: 'yaoji',
        text: '刺客袖里掉出一卷假诏,落款竟是颛顼。你看笔锋——起笔太急,是摹的。',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '五族里有人借神名传诏,把共主一步步引向那株毒草。',
        next: 'p3',
      },
      p3: {
        speaker: '瑶姬', portrait: 'yaoji',
        text: '蟠桃核收好。剩下一味在幽都,十巫守着,不轻易给活人。',
        next: 'p4',
      },
      p4: {
        speaker: '赤松', portrait: 'player',
        text: '活人也好,魂魄也好,总要问一句才甘心。',
        end: true,
      },
    },
  },

  /* ================= 第六章 幽都问魂 ================= */
  dlg_ch6_intro: {
    root: 'start',
    nodes: {
      start: {
        speaker: '巫咸', portrait: 'wuxian',
        text: '活人到幽都,多半为两件事:讨一味还魂草,或问一句来不及说的话。',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '两件我都要。神农尺在此,想问共主中毒那日的真相。',
        next: 'p3',
      },
      p3: {
        speaker: '巫咸', portrait: 'wuxian',
        text: '问魂要付代价:魂影不会只露一张脸。你先想清楚要看见什么。',
        choices: [
          { text: '我要看见下毒的人', next: 'killer' },
          { text: '我要看见那一日谷中还有谁', next: 'witness' },
        ],
      },
      killer: {
        speaker: '巫咸', portrait: 'wuxian',
        text: '香灰里浮起九蛇之纹——毒出水族。可递刀的手,不止一双。',
        next: 'p4',
      },
      witness: {
        speaker: '巫咸', portrait: 'wuxian',
        text: '香灰里浮起五色的衣袂——那日谷中,五族的人都到齐了。',
        next: 'p4',
      },
      p4: {
        speaker: '巫咸', portrait: 'wuxian',
        text: '还有个名字跟着你一路:宵明。她的魂没走远,在奈何桥头替人掌灯。',
        next: 'p5',
      },
      p5: {
        speaker: '赤松', portrait: 'player',
        text: '……我视她如妹。若她还在,请先替我照一照她的灯。',
        next: 'p6',
      },
      p6: {
        speaker: '巫咸', portrait: 'wuxian',
        text: '鬼王守在桥前,不肯放灯过去。破了他,草与话都给你。',
        actions: ['cin:play:cin_ch6_open'],
        end: true,
      },
    },
  },
  dlg_ch6_after: {
    root: 'start',
    nodes: {
      start: {
        speaker: '巫咸', portrait: 'wuxian',
        text: '魂影散了,留下三句话:毒出水族,刀过五族,诏自不周。',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '两味引子齐了。可要救的人,已经不在了。',
        next: 'p3',
      },
      p3: {
        speaker: '巫咸', portrait: 'wuxian',
        text: '药救不了死人,却能救活人。还魂草收好——鬼门之外,水声已经大作。',
        next: 'p4',
      },
      p4: {
        speaker: '赤松', portrait: 'player',
        text: '九州始涝。该去会一会那条九首的蛇了。',
        end: true,
      },
    },
  },

  /* ================= 第七章 水妖之乱 ================= */
  dlg_ch7_intro: {
    root: 'start',
    nodes: {
      start: {
        speaker: '泽叟', portrait: 'zesou',
        text: '神医,先别拔尺子!栈道只够再站二十来人,帮我一把。',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '水漫过屋脊了。相柳九首轮番抬头,毒涎落处草木俱枯。',
        next: 'p3',
      },
      p3: {
        speaker: '泽叟', portrait: 'zesou',
        text: '九个头,九条命。老朽在这泽里活了七十年,只见过它一次,那回淹了三州。你说应先顾哪头?',
        choices: [
          { text: '先护住栈道上的人', next: 'people' },
          { text: '先斩最近的一首', next: 'head' },
        ],
      },
      people: {
        speaker: '赤松', portrait: 'player',
        text: '先救人。药能解灼毒,也能压一压涎里的寒。',
        next: 'p4',
      },
      head: {
        speaker: '泽叟', portrait: 'zesou',
        text: '好胆气。可每斩一首水退一寸,人就能多站一寸——那就先斩,老朽替你挡着人。',
        next: 'p4',
      },
      p4: {
        speaker: '泽叟', portrait: 'zesou',
        text: '记住:别站进它吐过的水泡里,那东西沾衣就烂。',
        next: 'p5',
      },
      p5: {
        speaker: '赤松', portrait: 'player',
        text: '多谢。等水退了,我替这泽里的人再配一副解毒的方子。',
        actions: ['cin:play:cin_ch7_open'],
        end: true,
      },
    },
  },
  dlg_ch7_after: {
    root: 'start',
    nodes: {
      start: {
        speaker: '泽叟', portrait: 'zesou',
        text: '第九首沉下去了,水位在退。老朽活到今日,总算见着一次水往低处走。',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '相柳临去留了话:共工已上不周山。',
        next: 'p3',
      },
      p3: {
        speaker: '泽叟', portrait: 'zesou',
        text: '「他若回头,天就塌了」——这话我祖父那辈就传着。往北去吧,别带太多人。',
        next: 'p4',
      },
      p4: {
        speaker: '赤松', portrait: 'player',
        text: '解药在怀,尺在腰。剩下的路,我一个人走。',
        end: true,
      },
    },
  },

  /* ================= 终章 不周天倾 ================= */
  dlg_ch8_intro: {
    root: 'start',
    nodes: {
      start: {
        speaker: '共工', portrait: 'gonggong',
        text: '柱影里站着的,是神农的传人?我等你很久了。',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '假诏、内鬼、沉渊之毒。所有线头,今日都收在这一处。',
        next: 'p3',
      },
      p3: {
        speaker: '共工', portrait: 'gonggong',
        text: '你要先算哪一笔?挑一样,我照实答你。',
        choices: [
          { text: '先问那道假诏', next: 'edict' },
          { text: '先问共主之死', next: 'death' },
        ],
      },
      edict: {
        speaker: '共工', portrait: 'gonggong',
        text: '诏出我案头,字却是五族的人摹的。他们要共主去尝那株草,我要的是五族互相猜疑。',
        next: 'p4',
      },
      death: {
        speaker: '共工', portrait: 'gonggong',
        text: '毒是我水族的方子,可端药的手、传诏的人、闭门的太医,一个都不姓共工。',
        next: 'p4',
      },
      p4: {
        speaker: '赤松', portrait: 'player',
        text: '所以你把天下搅乱,只为证明「正道」也不干净?',
        next: 'p5',
      },
      p5: {
        speaker: '共工', portrait: 'gonggong',
        text: '不。我只是想看看,这根撑天的柱子,究竟经不经得起一个人用力。',
        next: 'p6',
      },
      p6: {
        speaker: '赤松', portrait: 'player',
        text: '……风从西北来了。天光低得反常。',
        actions: ['cin:play:cin_ch8_open'],
        end: true,
      },
    },
  },
  dlg_gonggong: {
    root: 'start',
    nodes: {
      start: {
        speaker: '共工', portrait: 'gonggong',
        text: '神农的传人?呵……颛顼的假诏、五族的倾轧、毒杀共主的黑手——你们「正道」,哪一样干净?',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '我不为五族来,也不为你来。我为栈道上那些还没走的人来。',
        next: 'p3',
      },
      p3: {
        speaker: '共工', portrait: 'gonggong',
        text: '苍生?那就让你看看,天柱折、地维绝之后,你们的苍生值几斤几两!',
        end: true,
      },
    },
  },
  dlg_ending: {
    root: 'start',
    nodes: {
      start: {
        speaker: '赤松', portrait: 'player',
        text: '天柱断了……西北的天穹塌下来,洪水自地底涌出。师尊,这就是你说的「天下将倾」吗?',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '蟠桃核与还魂草还在怀里,解药配成了,却再没有要救的人。',
        next: 'p3',
      },
      p3: {
        speaker: '赤松', portrait: 'player',
        text: '那就先救眼前的人吧。女娲氏的传说里,天是可以补的。',
        next: 'p4',
      },
      p4: {
        speaker: '赤松', portrait: 'player',
        text: '少年握紧神农尺,站进了风雨里。(续章·未完)',
        end: true,
      },
    },
  },
};
