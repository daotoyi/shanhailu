import * as THREE from 'three';
import type { World } from '../world/World.js';
import type { TriggerSystem } from '../world/Triggers.js';
import type { GameState } from './GameState.js';
import type { QuestManager } from './QuestManager.js';
import type { DialogRunner } from './DialogRunner.js';
import type { CinematicPlayer, CinematicDef } from '../render/Cinematic.js';
import type { NPC as NPCT } from '../actor/NPC.js';
import { createNpc, createCh1Patrols } from './NpcFactory.js';
import { CINEMATICS } from '../data/story/cinematics.js';
import {
  CHAPTER_ORDER, CHAPTER_SCRIPTS, chapterByKey, chapterByQuest,
  npcsForChapter, npcById, type ChapterKey, type ChapterNpcDef,
} from '../data/story/chapters.js';
import { CollectibleHerb } from './Collectible.js';
import type { InteractPrompt } from '../ui/InteractPrompt.js';
import type { QuestTracker } from '../ui/QuestTracker.js';

/** 过场定义已移至 data/story/cinematics.ts(数据驱动,九章卷首运镜同表) */

/** 章节→地图与战斗波 */
const CHAPTER_WAVES: Record<string, { mapId: string }> = {
  q_ch2_1: { mapId: 'jiuli-nanjiang' },
  q_ch3_1: { mapId: 'tanggu' },
  q_ch4_1: { mapId: 'shenlou-city' },
  q_ch5_1: { mapId: 'kunlun' },
  q_ch6_1: { mapId: 'youdu' },
  q_ch7_1: { mapId: 'shuize' },
  q_ch8_1: { mapId: 'buzhou' },
};

const STEALTH_RESET = new THREE.Vector3(0, 0, -13);

/**
 * 剧情导演(M3):按章节装配 NPC/触发器/采集物,桥接对话·任务·过场·存档。
 * 自拟改编剧本(§2.7):序章《蛮荒之始》+ 第一章《神农遗命》。
 */
export class ScenarioDirector {
  private npcs: NPCT[] = [];
  private herbs: CollectibleHerb[] = [];
  private markers: THREE.Group[] = [];
  private spawnedForChapter = '';
  /** 对话/过场/菜单冻结玩家 */
  freezePlayer = false;

  constructor(
    private readonly world: World,
    private readonly triggers: TriggerSystem,
    private readonly state: GameState,
    private readonly quests: QuestManager,
    private readonly dialogs: DialogRunner,
    private readonly cin: CinematicPlayer,
    private readonly prompt: InteractPrompt,
    private readonly tracker: QuestTracker,
    private readonly hooks: {
      onAutosaveHint: () => void;
      onSaveAtShrine: () => void;
      onShrineMenu: () => void;
      onStealthFail: () => void;
      onTeleportRequest: (mapId: string) => void;
      spawnWave: (kind: 'prologue_battle' | 'clear' | 'ch2' | 'ch3' | 'ch4' | 'ch5' | 'ch6' | 'ch7' | 'ch8') => void;
      openShop: () => void;
      onHerbPicked: (herbId: string) => void;
      combatEnemyCount: () => number;
    },
  ) {
    this.cin.bindActions((a) => this.applyAction(a));
    this.triggers.onStealthFail = () => {
      if (this.freezePlayer) return;
      this.hooks.onStealthFail();
    };
  }

  /* ============ 章节装配 ============ */

  /** 仅在章节/旗标被显式标脏时重建实体,避免每帧拼 key 与 filter 闭包 */
  private entitiesDirty = true;

  refreshEntities(): void {
    if (!this.entitiesDirty) return;
    this.entitiesDirty = false;
    const key = `${this.state.chapter}|${Object.keys(this.state.flags).filter((k) => this.state.flags[k] === true).join(',')}`;
    if (key === this.spawnedForChapter) return;
    this.spawnedForChapter = key;
    this.clearEntities();
    const scene = this.world.scene;
    const heightAt = this.world.heightAt;

    // 九章 NPC 统一按章节剧本表装配(含出现条件)
    this.spawnChapterNpcs(heightAt);

    if (this.state.chapter === 'prologue') {
      // 采集物:青茎芝 ×4
      for (const [hx, hz, idx] of [[-8, 14, 1], [18, 8, 2], [-19, -4, 3], [9, 22, 4]] as const) {
        const herb = new CollectibleHerb(`herb_${idx}`, 'herb_qingjingzhi', hx, hz, heightAt);
        this.herbs.push(herb);
        scene.add(herb.group);
      }
      // 教学战斗波:疫鬼×2 + Boss 瘴母(仅药王谷)
      if (this.quests.isActive('q_prologue_battle') && this.world.maps.def.id === 'yaowang-valley') {
        this.hooks.spawnWave('prologue_battle');
      }
    } else if (this.state.chapter === 'ch1') {
      // 潜行区:两名火把缇骑(神祠南侧路上)
      if (this.quests.isActive('q_ch1_1') && !this.state.getFlag('story.ch1_done')) {
        const heightFn = heightAt;
        for (const p of createCh1Patrols(heightFn)) this.triggers.addPatroller(scene, p);
        // 到达神祠(触发对话,完成第一章)+ 信标
        this.triggers.addZone({
          id: 'zone_shrine_stealth',
          pos: new THREE.Vector2(0, -30),
          radius: 4.2,
          once: true,
          onEnter: () => this.dialogs.start('dlg_shrine_found', () => {}),
        });
        const marker = this.triggers.makeMarker(new THREE.Vector3(0, heightFn(0, -30), -30));
        scene.add(marker);
        this.markers.push(marker);
      }
    } else {
      // ============ M7:第二章~终章 ============
      const mapId = this.world.maps.def.id;
      const questId = Object.keys(CHAPTER_WAVES).find((q) => this.quests.isActive(q));
      const waveDef = questId ? CHAPTER_WAVES[questId]! : null;

      // 章节战斗波(地图匹配 + 敌人未刷);NPC 已在方法开头按剧本表统一装配
      if (waveDef && waveDef.mapId === mapId && this.hooks.combatEnemyCount() === 0) {
        const chKey = questId!.replace('q_', '').split('_')[0]!;
        if (questId === 'q_ch8_1' && this.quests.getActiveQuest('q_ch8_1')!.stepIndex === 0) {
          // 对峙阶段:不刷 Boss
        } else {
          this.hooks.spawnWave(chKey as 'ch2');
        }
      }
    }
  }

  /** QuestTracker 等处触发旗标变化后调用刷新 */
  markChapterDirty(): void {
    this.entitiesDirty = true;
    this.spawnedForChapter = '';
  }

  /** 按章节剧本表装配本章 NPC(同屏最多 1~2 个,不增加渲染预算) */
  private spawnChapterNpcs(heightAt: (x: number, z: number) => number): void {
    const script = chapterByKey(this.state.chapter);
    if (!script || this.world.maps.def.id !== script.mapId) return;
    for (const def of npcsForChapter(this.state.chapter)) {
      if (!this.npcVisible(def)) continue;
      this.npcs.push(createNpc(this.world.scene, def.id, def.name, def.palette, def.pos, def.heading, heightAt));
    }
  }

  private npcVisible(def: ChapterNpcDef): boolean {
    if (!def.when) return true;
    return def.when.some((w) => {
      const [qid, step] = w.split('#');
      const a = this.quests.getActiveQuest(qid!);
      return !!a && (step === undefined || a.stepIndex === Number(step));
    });
  }

  private clearEntities(): void {
    const scene = this.world.scene;
    for (const n of this.npcs) n.removeFrom(scene);
    this.npcs = [];
    for (const h of this.herbs) scene.remove(h.group);
    this.herbs = [];
    for (const m of this.markers) scene.remove(m);
    this.markers = [];
    this.triggers.clear(scene);
  }

  /* ============ 交互与对话选择 ============ */

  /** NPC/神祠交互点注册(每次地图构建后由 main 调用) */
  bindInteractables(): void {
    const heightAt = this.world.heightAt;
    // 商铺(大荒城)
    if (this.world.maps.def.id === 'dahuang-city') {
      this.triggers.addInteractable({
        id: 'city_shop',
        pos: new THREE.Vector3(15, heightAt(15, 12), 12),
        radius: 3.2,
        prompt: '百草集 · 商铺',
        onInteract: () => {
          if (this.freezePlayer) return true;
          this.hooks.openShop();
          return true;
        },
      });
    }
    // 神祠(仅药王谷)
    if (this.world.maps.def.id === 'yaowang-valley') {
      this.triggers.addInteractable({
        id: 'shrine',
        pos: new THREE.Vector3(0, heightAt(0, -28), -28),
        radius: 3.4,
        prompt: '神祠 · 存息',
        onInteract: () => {
          if (this.freezePlayer) return true;
          this.hooks.onShrineMenu();
          return true;
        },
      });
    }
  }

  /** 依章节剧本表选择 NPC 对话树:任务#步骤 精确匹配 → 任务匹配 → 闲谈兜底 */
  private pickDialog(npcId: string): string | null {
    const def = npcById(npcId);
    if (!def) return null;
    for (const a of this.quests.getActiveList()) {
      const hit = def.dialogs[`${a.id}#${a.stepIndex}`] ?? def.dialogs[a.id];
      if (hit) return hit;
    }
    return def.dialogs['idle'] ?? null;
  }

  /* ============ 效果指令(对话/过场共用) ============ */

  applyAction(action: string): void {
    const [kind, ...rest] = action.split(':');
    if (kind === 'flag') {
      const [key, value] = rest;
      this.state.setFlag(key!, value === undefined ? true : value === 'true' ? true : value === 'false' ? false : value!);
      this.markChapterDirty();
    } else if (kind === 'quest' && rest[0] === 'accept') {
      if (this.quests.accept(rest[1]!)) this.markChapterDirty();
    } else if (kind === 'quest' && rest[0] === 'complete') {
      const id = rest[1]!;
      // 连续推进直至完成
      let guard = 8;
      while (this.quests.isActive(id) && guard-- > 0) this.quests.forceAdvance(id);
    } else if (kind === 'quest' && rest[0] === 'advance') {
      this.quests.forceAdvance(rest[1]!);
    } else if (kind === 'quest' && rest[0] === 'talk') {
      this.quests.progress('talk', rest[1]!);
    } else if (kind === 'cin' && rest[0] === 'play') {
      const def = CINEMATICS[rest[1] ?? ''];
      if (def) this.playCinematic(def);
    }
    void action;
  }

  /* ============ 帧更新 ============ */

  private prevDialogOpen = false;
  private interactCd = 0;

  update(dt: number, elapsed: number, interactPressed: boolean): void {
    // 实体刷新(key 对比,无变化时零成本)
    this.refreshEntities();
    // 打字机推进
    this.dialogs.tick(dt);
    // 对话关闭冷却:防止"关对话的 E"同帧重新触发 NPC 交互
    const wasOpen = this.prevDialogOpen;
    const isOpen = this.dialogs.isOpen;
    if (wasOpen && !isOpen) this.interactCd = 0.3;
    this.prevDialogOpen = isOpen;
    this.interactCd = Math.max(0, this.interactCd - dt);
    const canInteract = interactPressed && this.interactCd <= 0;
    const frozen = this.dialogs.isOpen || this.cin.isPlaying || this.freezePlayer;

    if (this.cin.isPlaying) {
      this.cin.update(dt, this.worldCamera(), elapsed);
      if (interactPressed) this.cin.requestSkip();
      this.prompt.hide();
      return;
    }

    // 触发器/NPC/采集物(冻结时仍更新巡逻动画但不判失败)
    const playerPos = this.world.player.position;
    const hit = this.triggers.update(dt, elapsed, playerPos, canInteract && !frozen, this.world.scene);
    for (const n of this.npcs) n.update(elapsed);
    for (const h of this.herbs) {
      h.update(elapsed);
      // 靠近采集(E)
      if (!h.picked && canInteract && !frozen && playerPos.distanceTo(h.pos) < 1.6) {
        h.pick();
        this.quests.progress('collect', h.herbId);
        this.hooks.onHerbPicked(h.herbId);
        this.tracker.showBanner('采得 青茎芝 ×1', 1600);
      }
    }

    // 交互提示
    if (!frozen && hit && !this.dialogs.isOpen) {
      this.prompt.show(hit.prompt);
      if (canInteract) {
        hit.onInteract();
      }
    } else if (!frozen) {
      // NPC 对话交互(最近的)
      let best: { d: number; npcId: string } | null = null;
      for (const n of this.npcs) {
        const d = playerPos.distanceTo(n.position);
        if (d < 2.6 && (!best || d < best.d)) best = { d, npcId: n.id };
      }
      if (best) {
        this.prompt.show(`与 ${this.npcs.find((n) => n.id === best.npcId)?.name ?? '旅人'} 交谈`);
        if (canInteract) {
          const dlg = this.pickDialog(best.npcId);
          if (dlg) {
            this.quests.progress('talk', dlg);
            this.dialogs.start(dlg, () => {});
          }
        }
      } else {
        this.prompt.hide();
      }
    } else {
      this.prompt.hide();
    }
  }

  private worldCamera(): THREE.PerspectiveCamera {
    return this.cameraRef;
  }
  cameraRef!: THREE.PerspectiveCamera;

  /* ============ 章节流转 ============ */

  /** 监听任务完成,按章节剧本表推进章内/章间流程(序章与终章保留特例) */
  onQuestCompleted(id: string): void {
    if (id === 'q_prologue_1') {
      // 晨课完 → 教学战斗(疫鬼)
      this.quests.accept('q_prologue_battle');
      this.markChapterDirty();
      this.tracker.showBanner('毒雾袭谷 · 疫鬼出没!', 2400);
    } else if (id === 'q_prologue_battle') {
      this.hooks.spawnWave('clear');
      this.quests.accept('q_prologue_2');
      this.markChapterDirty();
      this.tracker.showBanner('主线推进 · 噩耗传来', 2200);
    } else if (id === 'q_prologue_2') {
      this.state.setChapter('ch1');
      this.quests.accept('q_ch1_1');
      this.markChapterDirty();
      this.tracker.showBanner(CHAPTER_SCRIPTS.ch1.banner, 2600);
      this.hooks.onAutosaveHint();
    } else if (id === 'q_ch1_1') {
      // 月下托孤过场 → 第二章引子任务
      this.playCinematic(CINEMATICS['cin_ch1_end']!);
      this.state.setChapter('ch2');
      this.quests.accept('q_ch2_0');
      this.markChapterDirty();
      this.tracker.showBanner(CHAPTER_SCRIPTS.ch2.banner, 2600);
      this.hooks.onAutosaveHint();
    } else if (id === 'q_ch8_1') {
      // 结局过场 + 尾声对话
      this.playCinematic(CINEMATICS['cin_ending']!);
      this.cinBindEnd(() => this.dialogs.start('dlg_ending', () => {
        this.tracker.showBanner('《大荒山海录》本卷终 · 感谢游玩', 4000);
      }));
      this.hooks.onAutosaveHint();
    } else {
      // 二~终章通用流转:章内接下一任务;章末换章并接下一章首任务
      const script = chapterByQuest(id);
      const idx = script ? script.quests.indexOf(id) : -1;
      if (!script || idx < 0) return;
      if (idx < script.quests.length - 1) {
        this.quests.accept(script.quests[idx + 1]!);
        this.markChapterDirty();
      } else {
        const nextKey = CHAPTER_ORDER[CHAPTER_ORDER.indexOf(script.key as ChapterKey) + 1];
        const next = nextKey ? CHAPTER_SCRIPTS[nextKey] : undefined;
        if (!next) return;
        this.state.setChapter(next.key);
        this.quests.accept(next.quests[0]!);
        this.markChapterDirty();
        this.tracker.showBanner(next.banner, 2600);
        this.hooks.onAutosaveHint();
      }
    }
  }

  private cinEndCb: (() => void) | null = null;
  private cinBindEnd(cb: () => void): void {
    this.cinEndCb = cb;
  }

  playCinematic(def: CinematicDef): void {
    this.cin.play(def, this.cameraRef, () => {
      const cb = this.cinEndCb;
      this.cinEndCb = null;
      cb?.();
    });
  }

  /** 启动开场(仅新档) */
  playOpening(): void {
    this.playCinematic(CINEMATICS['cin_opening']!);
  }
}
