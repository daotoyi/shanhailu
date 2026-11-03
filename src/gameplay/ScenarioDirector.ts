import * as THREE from 'three';
import type { World } from '../world/World.js';
import type { TriggerSystem, Patroller } from '../world/Triggers.js';
import type { GameState } from './GameState.js';
import type { QuestManager } from './QuestManager.js';
import type { DialogRunner } from './DialogRunner.js';
import type { CinematicPlayer, CinematicDef } from '../render/Cinematic.js';
import { NPC, type NPC as NPCT } from '../actor/NPC.js';
import { CollectibleHerb } from './Collectible.js';
import type { InteractPrompt } from '../ui/InteractPrompt.js';
import type { QuestTracker } from '../ui/QuestTracker.js';

/** 开场运镜:山谷晨景 → 少年 */
const CIN_OPENING: CinematicDef = {
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
};

/** 第一章末过场:月下托孤 */
const CIN_CH1_END: CinematicDef = {
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
    },
  ) {
    this.cin.bindActions((a) => this.applyAction(a));
    this.triggers.onStealthFail = () => {
      if (this.freezePlayer) return;
      this.hooks.onStealthFail();
    };
  }

  /* ============ 章节装配 ============ */

  /** 每帧调用;依旗标刷新实体(廉价:旗标不变时跳过) */
  refreshEntities(): void {
    const key = `${this.state.chapter}|${Object.keys(this.state.flags).filter((k) => this.state.flags[k] === true).join(',')}`;
    if (key === this.spawnedForChapter) return;
    this.spawnedForChapter = key;
    this.clearEntities();
    const scene = this.world.scene;
    const heightAt = this.world.heightAt;

    if (this.state.chapter === 'prologue') {
      // 药翁师父
      const master = this.makeNpc('npc_master', '药翁', 'master', 'apprentice', [-14, -14.5], 0.9, heightAt);
      this.npcs.push(master);
      // 驿卒(噩耗后出现在谷口驿亭)
      if (this.state.getFlag('story.heard_intro') || this.quests.isActive('q_prologue_2')) {
        const courier = this.makeNpc('npc_courier', '驿卒', 'courier', 'courier', [16, -4], -1.2, heightAt);
        this.npcs.push(courier);
      }
      // 采集物:青茎芝 ×4
      for (const [hx, hz, idx] of [[-8, 14, 1], [18, 8, 2], [-19, -4, 3], [9, 22, 4]] as const) {
        const herb = new CollectibleHerb(`herb_${idx}`, 'herb_qingjingzhi', hx, hz, heightAt);
        this.herbs.push(herb);
        scene.add(herb.group);
      }
    } else if (this.state.chapter === 'ch1') {
      // 药翁(夜谈)
      const master = this.makeNpc('npc_master', '药翁', 'master', 'apprentice', [-14, -14.5], 0.9, heightAt);
      this.npcs.push(master);
      // 潜行区:两个杀手巡逻(神祠南侧路上)
      if (this.quests.isActive('q_ch1_1') && !this.state.getFlag('story.ch1_done')) {
        const p1: Patroller = {
          group: this.makeKiller('#5a2c22'),
          path: [new THREE.Vector3(-4, 0, -20), new THREE.Vector3(-4, 0, -34), new THREE.Vector3(-9, 0, -34), new THREE.Vector3(-9, 0, -20)],
          speed: 0.055,
          visionDist: 7.5,
          visionAngle: 0.62,
          legPhase: 0,
        };
        const p2: Patroller = {
          group: this.makeKiller('#33291f'),
          path: [new THREE.Vector3(5, 0, -36), new THREE.Vector3(5, 0, -22), new THREE.Vector3(10, 0, -22), new THREE.Vector3(10, 0, -36)],
          speed: 0.045,
          visionDist: 7.0,
          visionAngle: 0.6,
          legPhase: 0,
        };
        const heightFn = heightAt;
        for (const p of [p1, p2]) {
          for (const v of p.path) v.y = heightFn(v.x, v.z) + 0.02;
          p.group.position.copy(p.path[0]!);
          this.triggers.addPatroller(scene, p);
        }
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
    }
  }

  /** QuestTracker 等处触发旗标变化后调用刷新 */
  markChapterDirty(): void {
    this.spawnedForChapter = '';
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

  private makeNpc(
    id: string,
    name: string,
    _paletteKey: string,
    paletteId: string,
    pos: [number, number],
    heading: number,
    heightAt: (x: number, z: number) => number,
  ): NPCT {
    const npc = new NPC(id, name, paletteId, pos, heading, heightAt);
    npc.addTo(this.world.scene);
    return npc;
  }

  private makeKiller(color: string): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 1.5, 6),
      new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 }),
    );
    body.position.y = 0.75;
    body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 6),
      new THREE.MeshStandardMaterial({ color: '#1a140e', flatShading: true }),
    );
    head.position.y = 1.62;
    // 火把(发光点,警戒可读性)
    const torch = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 6, 6),
      new THREE.MeshStandardMaterial({ color: '#ff9a3c', emissive: '#ff6a1a', emissiveIntensity: 2.2 }),
    );
    torch.position.set(0.4, 1.5, 0.3);
    g.add(body, head, torch);
    return g;
  }

  /* ============ 交互与对话选择 ============ */

  /** NPC/神祠交互点注册(每次地图构建后由 main 调用) */
  bindInteractables(): void {
    const heightAt = this.world.heightAt;
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

  /** 依剧情状态选择 NPC 对话树 */
  private pickDialog(npcId: string): string | null {
    if (npcId === 'npc_master') {
      if (this.quests.isActive('q_ch1_1')) return 'dlg_npc_master_3';
      const p2 = this.quests.getActiveQuest('q_prologue_2');
      if (p2 && p2.stepIndex === 0) return 'dlg_npc_master_2';
      if (this.quests.isActive('q_prologue_1')) return 'dlg_npc_master';
      return 'dlg_npc_master_done';
    }
    if (npcId === 'npc_courier') return 'dlg_npc_courier';
    return null;
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
    }
    void action;
  }

  /* ============ 帧更新 ============ */

  update(dt: number, elapsed: number, interactPressed: boolean): void {
    // 实体刷新(key 对比,无变化时零成本)
    this.refreshEntities();
    // 打字机推进
    this.dialogs.tick(dt);
    const frozen = this.dialogs.isOpen || this.cin.isPlaying || this.freezePlayer;

    if (this.cin.isPlaying) {
      this.cin.update(dt, this.worldCamera(), elapsed);
      if (interactPressed) this.cin.requestSkip();
      this.prompt.hide();
      return;
    }

    // 触发器/NPC/采集物(冻结时仍更新巡逻动画但不判失败)
    const playerPos = this.world.player.position;
    const hit = this.triggers.update(dt, elapsed, playerPos, interactPressed && !frozen, this.world.scene);
    for (const n of this.npcs) n.update(elapsed);
    for (const h of this.herbs) {
      h.update(elapsed);
      // 靠近采集(E)
      if (!h.picked && interactPressed && !frozen && playerPos.distanceTo(h.pos) < 1.6) {
        h.pick();
        this.quests.progress('collect', h.herbId);
        this.tracker.showBanner('采得 青茎芝 ×1', 1600);
      }
    }

    // 交互提示
    if (!frozen && hit && !this.dialogs.isOpen) {
      this.prompt.show(hit.prompt);
      if (interactPressed) {
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
        if (interactPressed) {
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

  /** 监听任务完成,推进章节(由 main 桥接 quest:completed) */
  onQuestCompleted(id: string): void {
    if (id === 'q_prologue_1') {
      // 晨课完 → 噩耗
      this.quests.accept('q_prologue_2');
      this.markChapterDirty();
      this.tracker.showBanner('主线推进 · 噩耗传来', 2200);
    } else if (id === 'q_prologue_2') {
      this.state.setChapter('ch1');
      this.quests.accept('q_ch1_1'); // 章首自动接取(主线)
      this.markChapterDirty();
      this.tracker.showBanner('第一章 · 神农遗命', 2600);
      this.hooks.onAutosaveHint();
    } else if (id === 'q_ch1_1') {
      // 月下托孤过场
      this.playCinematic(CIN_CH1_END);
    }
  }

  playCinematic(def: CinematicDef): void {
    this.cin.play(def, this.cameraRef, () => {
      if (def.id === 'cin_opening') {
        // 开场运镜后接第一个任务(已在 onEndActions accept)
      }
    });
  }

  /** 启动开场(仅新档) */
  playOpening(): void {
    this.playCinematic(CIN_OPENING);
  }
}
