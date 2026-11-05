/**
 * 第二~四章对话(内容轮)。文案自拟改编,古神话出处见 docs/NAMES.md。
 * 分支只影响台词,不改任务流程;卷首运镜由引子对话末尾的 cin:play 触发。
 */
import type { DialogTree } from './types.js';

export const EARLY_DIALOGS: Record<string, DialogTree> = {
  /* ================= 第二章 苗疆结义 ================= */
  dlg_ch2_intro: {
    root: 'start',
    nodes: {
      start: {
        speaker: '蚩尤', portrait: 'chiyou',
        text: '背着一卷破书就敢闯九黎?……慢着。腰间那枚尺子,是神农尺。',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '药翁师父托付的。共主身中沉渊之毒,我要查到底是谁递的刀。',
        next: 'p3',
      },
      p3: {
        speaker: '蚩尤', portrait: 'chiyou',
        text: '九黎的规矩:想结交,先打架;想结义,先共生死。你先挑一样。',
        choices: [
          { text: '先打一架,痛快些', next: 'fight' },
          { text: '先问禁地的事', next: 'ask' },
        ],
      },
      fight: {
        speaker: '赤松', portrait: 'player',
        text: '那就打。不过我只会认药,拳脚生疏,你手下留情。',
        next: 'p4',
      },
      ask: {
        speaker: '赤松', portrait: 'player',
        text: '禁地里的傀儡,是九黎养的还是别人塞进来的?',
        next: 'p4',
      },
      p4: {
        speaker: '蚩尤', portrait: 'chiyou',
        text: '问得好。那几头傀儡是木族留下的旧机关,空转了十几年;昨日我去看,关节上多了新刻的蛇纹铜钉。',
        next: 'p5',
      },
      p5: {
        speaker: '赤松', portrait: 'player',
        text: '蛇纹……水族。共主中毒,果然不是一族的事。',
        next: 'p6',
      },
      p6: {
        speaker: '蚩尤', portrait: 'chiyou',
        text: '替我把禁地拆干净,钉子给你看。拆完歃血——往后水族的账,九黎陪你算。',
        next: 'p7',
      },
      p7: {
        speaker: '赤松', portrait: 'player',
        text: '一言为定。铜鼓声起,先会会这些傀儡。',
        actions: ['cin:play:cin_ch2_open'],
        end: true,
      },
    },
  },
  dlg_ch2_clash: {
    root: 'start',
    nodes: {
      start: {
        speaker: '蚩尤', portrait: 'chiyou',
        text: '禁地的门开了。听见没有?铜鼓一响,傀儡就认生人。',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '木族的机关,水族的钉子。今日先拆钉子。',
        next: 'p3',
      },
      p3: {
        speaker: '蚩尤', portrait: 'chiyou',
        text: '去!苗刀借你。等你回来,酒坛埋在图腾柱下,不醉不许走。',
        end: true,
      },
    },
  },
  dlg_npc_chiyou_done: {
    root: 'start',
    nodes: {
      start: {
        speaker: '蚩尤', portrait: 'chiyou',
        text: '兄弟,禁地清干净了?那枚蛇纹铜钉我收着,往后好拿来质问五族。',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '汤谷那边天上有十个太阳,九黎的牛都瘦了。',
        next: 'p3',
      },
      p3: {
        speaker: '蚩尤', portrait: 'chiyou',
        text: '往东去,找羿。他弓箭比我苗刀准;若有人借天灾遮掩什么,他一定先瞧出来。',
        end: true,
      },
    },
  },

  /* ================= 第三章 汤谷十日 ================= */
  dlg_ch3_intro: {
    root: 'start',
    nodes: {
      start: {
        speaker: '羿', portrait: 'houyi',
        text: '别站到扶桑树的影子里——今日连影子都是烫的。',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '十日并出,禾木俱焚。先生弓上搭着箭,为何三日不射?',
        next: 'p3',
      },
      p3: {
        speaker: '羿', portrait: 'houyi',
        text: '你替我想想:这一箭落下去,是救了流民,还是替谁把最后一分水气也烤干?',
        choices: [
          { text: '怕伤及扶桑根下的流民', next: 'pity' },
          { text: '怕金乌背后另有人', next: 'suspect' },
        ],
      },
      pity: {
        speaker: '羿', portrait: 'houyi',
        text: '心善。可你抬头看——那十只金乌的翅上,都系着同一式样的铜牌。',
        next: 'p4',
      },
      suspect: {
        speaker: '羿', portrait: 'houyi',
        text: '眼利。铜牌上是水族的调兵符:十日不是自己飞出来的,是有人赶上去的。',
        next: 'p4',
      },
      p4: {
        speaker: '羿', portrait: 'houyi',
        text: '天灾摆在最亮处,就没人去看暗处的兵。我射日,你替我护住扶桑根与那些走不动的人。',
        next: 'p5',
      },
      p5: {
        speaker: '赤松', portrait: 'player',
        text: '神农尺可解灼毒。先生只管张弓。',
        next: 'p6',
      },
      p6: {
        speaker: '羿', portrait: 'houyi',
        text: '好。第一只金乌落在温泉之畔,先取它翅骨里的铜牌。',
        actions: ['cin:play:cin_ch3_open'],
        end: true,
      },
    },
  },
  dlg_ch3_after: {
    root: 'start',
    nodes: {
      start: {
        speaker: '羿', portrait: 'houyi',
        text: '一羽落,天凉了一分。焦土上终于有影子了。',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '铜牌上的符,与九黎傀儡关节的蛇纹是一对。',
        next: 'p3',
      },
      p3: {
        speaker: '羿', portrait: 'houyi',
        text: '借天灾调兵,水族的老手法。剩下的九日我慢慢射,你别停下——往西,昆仑的蟠桃会要开了。',
        next: 'p4',
      },
      p4: {
        speaker: '赤松', portrait: 'player',
        text: '五族齐聚的地方,也最容易看清谁在递刀。',
        end: true,
      },
    },
  },

  /* ================= 第四章 蜃楼迷踪 ================= */
  dlg_ch4_intro: {
    root: 'start',
    nodes: {
      start: {
        speaker: '雨师妾', portrait: 'yushiqie',
        text: '哎呀,一个活人走进蜃楼城?你猜脚下踩着的是街道,还是我的一面水镜。',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '我在找一个影子。有人看见它学着共工的样子抬过头。',
        next: 'p3',
      },
      p3: {
        speaker: '雨师妾', portrait: 'yushiqie',
        text: '胆子不小嘛。那你想先听哪一句?',
        choices: [
          { text: '我只问路', next: 'road' },
          { text: '我问问你是谁的人', next: 'whois' },
        ],
      },
      road: {
        speaker: '雨师妾', portrait: 'yushiqie',
        text: '路?这城里的路随念头改向。不过水镜后面那条是真的——蜃妖就在那儿。',
        next: 'p4',
      },
      whois: {
        speaker: '雨师妾', portrait: 'yushiqie',
        text: '我啊,谁的人都不是。水族姓共工,可不等于人人都乐意替他当刀。',
        next: 'p4',
      },
      p4: {
        speaker: '雨师妾', portrait: 'yushiqie',
        text: '蜃妖模仿谁不好,偏挑共工。因为它见过那道假诏——幻影只会照着人心里最怕的东西长。',
        next: 'p5',
      },
      p5: {
        speaker: '赤松', portrait: 'player',
        text: '假诏……师父说,先报信的人先被灭口。看来写诏的人还在。',
        next: 'p6',
      },
      p6: {
        speaker: '雨师妾', portrait: 'yushiqie',
        text: '破镜去吧,小神医。打完记得来谢我——也许我会告诉你一点沉渊之毒的事哦。',
        actions: ['cin:play:cin_ch4_open'],
        end: true,
      },
    },
  },
  dlg_ch4_clash: {
    root: 'start',
    nodes: {
      start: {
        speaker: '雨师妾', portrait: 'yushiqie',
        text: '水镜一开,城里会有九个你,八个是假的。',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '怎么辨?',
        next: 'p3',
      },
      p3: {
        speaker: '雨师妾', portrait: 'yushiqie',
        text: '真那个不会回头看你。幻影最爱的,就是学人照镜子。',
        next: 'p4',
      },
      p4: {
        speaker: '赤松', portrait: 'player',
        text: '那我就不看它们。神农尺在手,照着水气最重的一处走。',
        end: true,
      },
    },
  },
  dlg_npc_yushiqie_2: {
    root: 'start',
    nodes: {
      start: {
        speaker: '雨师妾', portrait: 'yushiqie',
        text: '说话算话。解沉渊要两味引子:昆仑蟠桃的核,幽都的还魂草。',
        next: 'p2',
      },
      p2: {
        speaker: '赤松', portrait: 'player',
        text: '水族的秘毒,你倒背得比谁都熟。为什么告诉我?',
        next: 'p3',
      },
      p3: {
        speaker: '雨师妾', portrait: 'yushiqie',
        text: '我亦正亦邪,可不乐意被人当刀使。何况……共工案头那道诏,本不该写我的族名。',
        next: 'p4',
      },
      p4: {
        speaker: '赤松', portrait: 'player',
        text: '昆仑在西,幽都在下。我两处都去。',
        next: 'p5',
      },
      p5: {
        speaker: '雨师妾', portrait: 'yushiqie',
        text: '别死在鬼界呀。你欠我一声谢,我可还没收。',
        end: true,
      },
    },
  },
};
