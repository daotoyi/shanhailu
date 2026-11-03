/**
 * 对话树数据(PROMPT §3.2)。文案全部自拟改编(§2.7):
 * 骨架取古神话(神农尝百草/赤松子为雨师)框架,不使用受保护小说的人名与原文。
 */

export interface DialogNode {
  speaker?: string;
  /** 头像标识:角色色板 id 或 'master'/'player' 等命名位 */
  portrait?: string;
  text: string;
  choices?: { text: string; next: string }[];
  next?: string;
  /** 本句播完时应用的效果前缀列表 */
  actions?: string[];
  /** 结束节点:标记 dialog 结束 */
  end?: boolean;
}

export interface DialogTree {
  root: string;
  nodes: Record<string, DialogNode>;
}

export const DIALOGS: Record<string, DialogTree> = {
  /* ---- 药翁师父(日常/主线共用,节点分流) ---- */
  dlg_npc_master: {
    root: 'start',
    nodes: {
      start: {
        speaker: '药翁',
        portrait: 'master',
        text: '赤松,起得倒早。谷里的青茎芝开得正好,去采三株来,今日教你认药性。',
        next: 'p2',
      },
      p2: { speaker: '赤松', portrait: 'player', text: '师父,青茎芝性凉,可解春困之毒,对也不对?', next: 'p3' },
      p3: { speaker: '药翁', portrait: 'master', text: '哈,书没白背。去吧,若遇上贪嘴的野兔,也别惊了药田。', next: 'p4' },
      p4: { speaker: '药翁', portrait: 'master', text: '采药时脚下留神,谷东溪畔雾重。', end: true },
    },
  },
  dlg_npc_master_done: {
    root: 'start',
    nodes: {
      start: { speaker: '药翁', portrait: 'master', text: '嗯……叶脉青润,根须完好,是好芝。收着吧,今日晨课算你过了。', end: true },
    },
  },

  /* ---- 驿卒(噩耗) ---- */
  dlg_npc_courier: {
    root: 'start',
    nodes: {
      start: {
        speaker: '驿卒',
        portrait: 'courier',
        text: '让开让开——!各部急报:共主……共主神农氏,在尝药途中身中奇毒,太医束手!',
        next: 'p2',
      },
      p2: { speaker: '赤松', portrait: 'player', text: '神农共主?!他遍尝百草,怎会……', next: 'p3' },
      p3: {
        speaker: '驿卒',
        portrait: 'courier',
        text: '谁知道呢。五族的人已经往这边赶了,说是要"侍疾"。我看哪,是来抢东西的。',
        next: 'p4',
      },
      p4: { speaker: '驿卒', portrait: 'courier', text: '小哥,我看你面善,听一句劝:这几日,别乱走。', end: true },
    },
  },

  /* ---- 第一章:师父夜谈与托付 ---- */
  dlg_npc_master_2: {
    root: 'start',
    nodes: {
      start: {
        speaker: '药翁',
        portrait: 'master',
        text: '……都听说了?神农共主中毒,五族齐聚。你可知,五十年前,我曾在神农谷中侍药三月。',
        next: 'p2',
      },
      p2: {
        speaker: '药翁',
        portrait: 'master',
        text: '那三月里,我见过共主此毒一次——那不是误尝,是有人下的。毒名"沉渊",水族秘传。',
        next: 'p3',
      },
      p3: { speaker: '赤松', portrait: 'player', text: '水族?!那我们快去报信——', next: 'p4' },
      p4: {
        speaker: '药翁',
        portrait: 'master',
        text: '报信?先报信的人,往往是先被灭口的人。去谷口听听驿马怎么说,再来见我。',
        end: true,
      },
    },
  },
  dlg_npc_master_3: {
    root: 'start',
    nodes: {
      start: {
        speaker: '药翁',
        portrait: 'master',
        text: '回来了。……孩子,坐。今夜说的话,出了这扇门,你一个字都不能认。',
        next: 'p2',
      },
      p2: {
        speaker: '药翁',
        portrait: 'master',
        text: '三十年前,神农共主微服至此,在我这药庐住过一夜。他留下一卷手书,说"待天下将倾,托付有缘"。',
        next: 'p3',
      },
      p3: {
        speaker: '药翁',
        portrait: 'master',
        text: '如今共主中毒,五族逐鹿,天下将倾——这就是了。',
        actions: ['flag:story.book_revealed'],
        next: 'p4',
      },
      p4: {
        speaker: '药翁',
        portrait: 'master',
        text: '《神农本草经》真本,连同一枚神农尺,我藏在了后山神祠。带上它们,去南边,找九黎的蚩尤。',
        next: 'p5',
      },
      p5: {
        speaker: '药翁',
        portrait: 'master',
        text: '路上不太平。五族的耳目已经进了谷——避开他们的火把,别回头。',
        actions: ['quest:accept:q_ch1_1'],
        end: true,
      },
    },
  },

  /* ---- 神祠(到达后) ---- */
  dlg_shrine_found: {
    root: 'start',
    nodes: {
      start: {
        speaker: '赤松',
        portrait: 'player',
        text: '神祠……师父的石匣就在香案之下。这一路,居然真的躲过来了。',
        next: 'p2',
      },
      p2: {
        speaker: '赤松',
        portrait: 'player',
        text: '《神农本草经》……神农尺。从今日起,这就是我的命了。',
        actions: ['flag:story.got_bencao', 'quest:complete:q_ch1_1'],
        end: true,
      },
    },
  },
};
