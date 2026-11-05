import './ui/theme.css';

import * as THREE from 'three';
import { EventBus } from './core/events.js';
import { Engine } from './core/Engine.js';
import { initPAL, pal } from './core/PAL/index.js';
import { InputManager } from './core/Input/InputManager.js';
import { ServiceKey, provide } from './core/Services.js';
import { PostFX } from './render/PostFX.js';
import { QualityManager } from './render/Quality.js';
import { World } from './world/World.js';
import { FollowCamera } from './world/FollowCamera.js';
import { TriggerSystem } from './world/Triggers.js';
import { MAPS } from './data/maps.js';
import { GameState } from './gameplay/GameState.js';
import { QuestManager } from './gameplay/QuestManager.js';
import { SaveSystem } from './gameplay/SaveSystem.js';
import { DialogRunner } from './gameplay/DialogRunner.js';
import { ScenarioDirector } from './gameplay/ScenarioDirector.js';
import { CombatSystem } from './gameplay/CombatSystem.js';
import { Inventory } from './gameplay/Inventory.js';
import { Equipment } from './gameplay/Equipment.js';
import { Progression } from './gameplay/Progression.js';
import { Alchemy } from './gameplay/Alchemy.js';
import { BeastSystem } from './gameplay/BeastSystem.js';
import { Achievements } from './gameplay/Achievements.js';
import { AudioDirector } from './audio/AudioDirector.js';
import { BEASTS, CATCH_ITEM } from './data/bestiary.js';
import { ITEMS, type ItemDef } from './data/items.js';
import { MONSTERS } from './data/monsters.js';
import { DROP_TABLE } from './data/progression.js';
import { CinematicPlayer } from './render/Cinematic.js';
import { ensureGameFonts, type FontSource } from './ui/FontManager.js';
import { F3Panel } from './ui/F3Panel.js';
import { LoadingScreen } from './ui/LoadingScreen.js';
import { Minimap } from './ui/Minimap.js';
import { TransitionOverlay } from './ui/TransitionOverlay.js';
import { UIRoot } from './ui/UIRoot.js';
import { TouchControls } from './ui/dom/TouchControls.js';
import { TweenEngine } from './ui/framework/Tween.js';
import { DialogUIDom } from './ui/DialogUI.js';
import { InteractPrompt } from './ui/InteractPrompt.js';
import { QuestTracker } from './ui/QuestTracker.js';
import { SaveMenuUI } from './ui/SaveMenuUI.js';
import { PlayerHUD } from './ui/PlayerHUD.js';
import { GamePanels } from './ui/GamePanels.js';
import { CanvasLoading } from './ui/canvas/CanvasLoading.js';
import { NarrativeBar } from './ui/NarrativeBar.js';
import { StoryNav } from './ui/StoryNav.js';
import { DebugCamera } from './world/DebugCamera.js';

const FONT_SOURCE_LABEL: Record<FontSource, string> = {
  subset: '本地子集',
  cdn: 'CDN 按需',
  system: '系统楷体',
};

/** 让出主线程使进度条得以绘制(setTimeout 而非 rAF:窗口被遮挡时 rAF 会整档暂停) */
function nextFrame(ms = 24): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function boot(): Promise<void> {
  const bus = new EventBus();
  provide<EventBus>(ServiceKey.Bus, bus);
  const ui = new UIRoot();
  // M9 POC:?ui=canvas 切换 canvas UI 后端(与 DOM 后端同接口)
  const useCanvasUI = new URLSearchParams(location.search).get('ui') === 'canvas';
  if (useCanvasUI) {
    // canvas 后端接管加载页:移除 index.html 预置的 DOM 骨架,避免残影
    document.getElementById('boot-splash')?.remove();
  }
  const loading = useCanvasUI ? new CanvasLoading(ui) : new LoadingScreen();
  const tween = new TweenEngine();

  loading.setProgress(0.06, '初始化平台层');
  const p = initPAL();
  const surface = p.platform.getSurface();
  const engine = new Engine(surface, bus);

  let winW = 1280;
  let winH = 720;
  {
    const off = p.platform.onResize((w, h) => {
      winW = w;
      winH = h;
    });
    off();
  }
  ui.resize(winW, winH);

  /* ---- 世界与核心系统 ---- */
  loading.setProgress(0.16, '雕凿山河');
  await nextFrame();
  const input = new InputManager(bus);
  provide<typeof input>(ServiceKey.Input, input);
  const world = new World(input, bus);
  await nextFrame();

  loading.setProgress(0.5, '汇聚灵光');
  const camera = new THREE.PerspectiveCamera(50, winW / winH, 0.5, 1200);
  const postfx = new PostFX(engine.renderer, world.scene, camera, winW, winH);
  const quality = new QualityManager(bus);
  quality.bind({ renderer: engine.renderer, postfx, sunLight: world.env.sunLight });

  bus.on('engine:resize', ({ width, height }) => {
    ui.resize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    postfx.setSize(width, height);
  });
  engine.onFrameEnd(() => input.endFrame());

  /* ---- 剧情/任务/存档 ---- */
  const state = new GameState(bus);
  const quests = new QuestManager(bus, state);
  const save = new SaveSystem(state, quests);
  const triggers = new TriggerSystem();
  const cin = new CinematicPlayer(ui);

  /* ---- 成长/物品(M5) ---- */
  const inventory = new Inventory();
  const equipment = new Equipment(inventory);
  const progression = new Progression(bus, inventory, () => equipment.bonus());
  const alchemy = new Alchemy(inventory, equipment);
  progression.recompute();
  // 开局行囊:药锄 + 应急丹药
  inventory.add('wp_hoe', 1);
  inventory.add('pill_huixue', 3);
  inventory.add('herb_qingjingzhi', 2);
  const dialogUI = new DialogUIDom(ui);
  let directorRef: ScenarioDirector | null = null;
  const dialogs = new DialogRunner(
    bus,
    (a) => directorRef?.applyAction(a),
    (r) => {
      dialogUI.bindRunner(r);
      return dialogUI;
    },
  );

  const followCam = new FollowCamera(camera, input, world.heightAt);
  const debugCam = new DebugCamera(camera, input);
  let useDebugCam = false;
  bus.on('input:action', ({ action, phase }) => {
    if (phase !== 'start') return;
    if (action === 'toggleDebugCam') {
      useDebugCam = !useDebugCam;
      if (!useDebugCam) followCam.snapTo(world.player.position);
    }
    if (action === 'interact' && cin.isPlaying) cin.requestSkip();
  });
  followCam.snapTo(world.player.position);

  /* ---- 战斗系统 ---- */
  const combat = new CombatSystem(world, input, bus, followCam, camera, ui);
  const hud = new PlayerHUD(ui);
  hud.show();

  /* ---- 音频与成就(M8) ---- */
  const audio = new AudioDirector(bus);
  const achievements = new Achievements(bus);
  achievements.setBanner((text) => tracker.showBanner(text, 2600));

  /* ---- 神兽系统(M6) ---- */
  const beasts = new BeastSystem(world.scene, bus);
  bus.on('quest:kill', ({ monsterId }) => {
    const beast = BEASTS.find((b) => b.monsterId === monsterId);
    if (beast) beasts.recordKill(beast.id);
  });
  bus.on('quest:accepted', ({ id }) => narrative.onQuestAccepted(id));
  bus.on('quest:completed', ({ id }) => narrative.onQuestCompleted(id));
  bus.on('beast:caught', ({ name }) => {
    tracker.showBanner(`契约成立 · ${name}`, 2600);
    beasts.setActive(beasts.contracted.length - 1);
    panels.markDirty();
  });
  const combatHitFeedback = (e: Parameters<typeof combat.damageEnemy>[0], amount: number, crit: boolean, em: number) => {
    combat.damageEnemy(e, amount, crit, em);
    combat.hitfx.floatDamage(new THREE.Vector3(e.position.x, e.position.y + 1.2, e.position.z), amount, { crit, elementMul: em });
    combat.hitfx.hitstop(crit ? 0.08 : 0.045);
    combat.hitfx.shake(crit ? 0.4 : 0.2);
  };
  /** 每帧复用的神兽协战 hooks,避免每帧新建对象与闭包 */
  const beastHooks: Parameters<typeof beasts.update>[5] = {
    damageEnemy: (e, amount, crit, em) => combatHitFeedback(e, amount, crit, em),
    floatHeal: (amount) => {
      combat.stats.heal(amount);
      combat.hitfx.floatDamage(
        new THREE.Vector3(world.player.position.x, world.player.position.y + 1.8, world.player.position.z),
        amount,
        { heal: true },
      );
    },
    playerAtk: combat.stats.block.atk,
    playerElement: combat.stats.block.element,
  };
  bus.on('input:action', ({ action, phase }) => {
    if (action === 'toggleRide' && phase === 'start') {
      const target = !beasts.riding;
      if (beasts.setRiding(target)) {
        world.player.speed = 5.6 + beasts.rideSpeedBonus;
        tracker.showBanner(target ? '翻身上马 · 鹿蜀嘶鸣' : '下马休整', 1800);
      } else if (target) {
        tracker.showBanner('需要出战一头可骑乘的神兽(鹿蜀)', 2200);
      }
    }
  });
  // 野外异兽(每图刷新;削弱后可契约)
  const spawnWildBeasts = (): void => {
    const mapId = world.maps.def.id;
    if (mapId === 'yaowang-valley') {
      combat.spawnMonster('beast_lushu', 26, 22);
      combat.spawnMonster('beast_fox', -28, 4);
    } else if (mapId === 'dahuang-city') {
      combat.spawnMonster('beast_bifang', -34, -34);
    }
  };
  bus.on('world:respawn', () => {
    tracker.showBanner('香火护佑 · 神祠前醒来', 2000);
    followCam.snapTo(world.player.position);
  });
  combat.onPlayerDown = () => tracker.showBanner('力竭倒下……', 2200);

  /* ---- M5:属性同步 / 武器可视 / 面板 ---- */
  const equippedWeaponModel = (): 'hoe' | 'blade' | 'sword' | null => {
    const w = equipment.slots['weapon'];
    if (!w) return null;
    return ITEMS[w.itemId]?.equip?.model ?? null;
  };
  const syncStats = (): void => {
    const oldMax = combat.stats.block.maxHp;
    const ratio = oldMax > 0 ? combat.stats.hp / oldMax : 1;
    combat.stats.block = { ...progression.finalStats };
    combat.stats.hp = Math.min(combat.stats.block.maxHp, Math.max(1, Math.round(ratio * combat.stats.block.maxHp)));
    combat.stats.mp = Math.min(combat.stats.mp, combat.stats.block.maxMp);
    world.player.setWeaponModel(equippedWeaponModel());
  };
  syncStats();
  // 开局穿药锄
  {
    const idx = inventory.slots.findIndex((s) => s && ITEMS[s.itemId]?.equip);
    if (idx >= 0) equipment.equipFromBag(idx);
    syncStats();
  }
  bus.on('prog:levelup', ({ level }) => {
    syncStats();
    tracker.showBanner(`等级提升 · Lv.${level}`, 2000);
  });
  bus.on('prog:breakthrough', ({ realm, unlocks }) => {
    syncStats();
    tracker.showBanner(`突破!境界 · ${realm}`, 2600);
    if (unlocks.length > 0) console.info(`[境界] 解锁:${unlocks.join('、')}`);
  });
  bus.on('quest:kill', ({ monsterId }) => {
    quests.progress('kill', monsterId);
    const def = MONSTERS[monsterId];
    if (def) progression.gainExp(def.exp);
    const table = DROP_TABLE[monsterId] ?? [];
    for (const entry of table) {
      if (Math.random() < entry.chance) {
        const [cmin, cmax] = entry.count ?? [1, 1];
        const n = cmin + Math.floor(Math.random() * (cmax - cmin + 1));
        inventory.add(entry.itemId, n);
      }
    }
    panels.markDirty();
  });
  combat.onPickup = (kind, amount) => {
    if (kind === 'coin') inventory.coins += amount;
    else {
      const herbs = ['herb_qingjingzhi', 'herb_xuejiancao'];
      inventory.add(herbs[Math.floor(Math.random() * herbs.length)]!, amount);
    }
    audio.sfx('pickup', 0.5);
    panels.markDirty();
  };
  const panels = new GamePanels(inventory, equipment, progression, alchemy, beasts, achievements, bus, ui, {
    onUseItem: (bagIndex) => {
      const def: ItemDef | null = inventory.consume(bagIndex);
      if (!def?.effects) return;
      const e = def.effects;
      const potionBoost = progression.realmIndex >= 2 ? 1.25 : 1; // 真气被动·药理
      if (e.healHp) combat.stats.heal(Math.round(e.healHp * potionBoost));
      if (e.healMp) combat.stats.healMp(Math.round(e.healMp * potionBoost));
      if (e.curePoison) combat.stats.poisonUntil = 0;
      if (e.atkBuff) progression.applyBuff('atk', e.atkBuff.value, e.atkBuff.dur, engine.time.elapsed);
      if (e.defBuff) progression.applyBuff('def', e.defBuff.value, e.defBuff.dur, engine.time.elapsed);
      syncStats();
      panels.markDirty();
    },
    onEquipChanged: () => {
      progression.recompute();
      syncStats();
      panels.markDirty();
    },
    onQualityChange: (level) => {
      quality.set(level);
    },
    onSensitivityChange: (v) => {
      followCam.sensitivity = 0.0032 * v;
    },
    onVolumeChange: (track, v) => {
      audio.setVolume(track, v);
    },
    getQuality: () => quality.current,
    getSensitivity: () => followCam.sensitivity / 0.0032,
    getVolumes: () => audio.volumes,
  });
  panels.onClosed(() => {
    director.freezePlayer = false;
  });
  const openShop = (): void => {
    panels.open('shop');
    director.freezePlayer = true;
  };

  /* ---- UI 层 ---- */
  const touch = new TouchControls(input, ui);
  void touch;
  const minimap = new Minimap(ui);
  minimap.setMap(world.maps.map);
  const transition = new TransitionOverlay(ui);
  const prompt = new InteractPrompt(ui);
  const tracker = new QuestTracker(ui, quests, bus);
  const narrative = new NarrativeBar(ui);
  const storyNav = new StoryNav(ui, (entry) => {
    if (transition.isBusy) return;
    teleportTo(entry.mapId, entry.spawnId);
  });
  const f3 = new F3Panel(
    bus,
    {
      renderer: engine.renderer,
      time: engine.time,
      camera,
      quality: () => quality.current,
      extra: () => `${world.maps.def.name} · ${state.chapter}`,
    },
    ui,
  );

  /* ---- 场景导演 ---- */
  const playerBlob = () => ({
    pos: [world.player.position.x, world.player.position.y, world.player.position.z] as [number, number, number],
    heading: world.player.heading,
  });
  const applySave = (data: NonNullable<ReturnType<SaveSystem['load']>>) => {
    try {
      state.deserialize(data);
      quests.deserialize(data.quests);
      inventory.deserialize(data.bag ?? { slots: [], coins: 0 });
      equipment.deserialize(data.equip ?? {});
      progression.deserialize(data.prog ?? {});
      combat.clearEnemies(); // 读档切图前清场,防止旧图敌人残留
      const def = MAPS[data.mapId];
      world.switchMap(data.mapId, def?.spawns[0]!.id ?? 'start');
      // 精确落位(存档点位姿)
      world.player.position.set(data.player.pos[0], data.player.pos[1], data.player.pos[2]);
      world.player.heading = data.player.heading;
      minimap.setMap(world.maps.map);
      followCam.snapTo(world.player.position);
      directorRef?.markChapterDirty();
      directorRef?.refreshEntities();
      directorRef?.bindInteractables();
      beastSystemDeserialize(data);
      progression.recompute();
      syncStats();
      panels.markDirty();
      tracker.refresh();
    } catch (e) {
      console.error('[Save] 读档失败,已保留当前进度', e);
      tracker.showBanner('存档损坏 · 已保留当前进度', 2600);
    }
  };

  const beastSystemDeserialize = (data: NonNullable<ReturnType<SaveSystem['load']>>): void => {
    beasts.deserialize(data.bestiary ?? {});
    achievements.deserialize((data as { achievements?: { unlocked?: string[]; kills?: number } }).achievements ?? {});
  };

  const saveBlobExtra = () => ({
    bag: inventory.serialize(),
    equip: equipment.serialize(),
    prog: progression.serialize(),
    bestiary: beasts.serialize(),
    achievements: achievements.serialize(),
  });

  const afterMapSwitch = (pos: THREE.Vector3): void => {
    combat.clearEnemies(); // 切图统一清场(含几何材质/弹道/掉落/飘字)
    minimap.setMap(world.maps.map);
    followCam.snapTo(pos);
    directorRef?.markChapterDirty();
    directorRef?.refreshEntities();
    directorRef?.bindInteractables();
    spawnWildBeasts();
    // BGM 换调(每图一调,五声音阶循环)
    const mapIds = Object.keys(MAPS);
    audio.setKey(mapIds.indexOf(world.maps.def.id));
    narrative.onChapter(world.maps.def.name, world.maps.def.epigraph);
  };

  const teleportTo = (mapId: string, spawnId?: string): void => {
    const def = MAPS[mapId];
    if (!def) return;
    transition.run(def.name, def.epigraph, () => {
      const pos = world.switchMap(mapId, spawnId ?? def.spawns[0]!.id);
      afterMapSwitch(pos);
    });
  };

  const director = new ScenarioDirector(world, triggers, state, quests, dialogs, cin, prompt, tracker, {
    onAutosaveHint: () => {
      save.save(0, playerBlob(), world.maps.def.id, saveBlobExtra());
      tracker.showBanner('自动存档完成', 1800);
    },
    onSaveAtShrine: () => {
      // 经菜单存档(菜单 hooks 处理);此钩子留作快捷键
    },
    onShrineMenu: () => {
      saveMenu.open();
      director.freezePlayer = true;
    },
    onStealthFail: () => {
      world.player.position.set(0, world.heightAt(0, -13), -13);
      followCam.snapTo(world.player.position);
      tracker.showBanner('行踪败露!退回谷中再试', 2200);
    },
    onTeleportRequest: (mapId) => teleportTo(mapId),
    openShop: () => openShop(),
    onHerbPicked: (herbId) => {
      inventory.add(herbId, 1);
      panels.markDirty();
    },
    spawnWave: (kind) => {
      if (kind === 'clear') {
        combat.clearEnemies();
        return;
      }
      combat.clearEnemies();
      const def = world.maps.def.id;
      const pos = (x: number, z: number) => [x, world.heightAt(x, z), z] as const;
      if (kind === 'prologue_battle') {
        combat.spawnMonster('yigui', -6, -2);
        combat.spawnMonster('yigui', 10, -4);
        combat.spawnMonster('yigui_boss', 0, 14);
        tracker.showBanner('瘴母已现身于池塘之畔', 2400);
        return;
      }
      if (def === 'jiuli-nanjiang' && kind === 'ch2') {
        combat.spawnMonster('puppet', -14, -18);
        combat.spawnMonster('puppet', 14, -16);
        combat.spawnMonster('puppet', 0, -38);
      } else if (def === 'tanggu' && kind === 'ch3') {
        combat.spawnMonster('golden_crow', 0, -30);
        tracker.showBanner('金乌振翅 · 十日齐辉', 2400);
      } else if (def === 'shenlou-city' && kind === 'ch4') {
        combat.spawnMonster('mirage_demon', 0, -26);
      } else if (def === 'kunlun' && kind === 'ch5') {
        combat.spawnMonster('water_assassin', 0, -24);
        tracker.showBanner('刺客出自庆功酒!', 2400);
      } else if (def === 'youdu' && kind === 'ch6') {
        combat.spawnMonster('ghost_king', 0, -28);
      } else if (def === 'shuize' && kind === 'ch7') {
        combat.spawnMonster('yigui', -12, -12);
        combat.spawnMonster('yigui', 12, -10);
        combat.spawnMonster('xiangliu', 0, -30);
        tracker.showBanner('九首搅动泽国 · 相柳现身', 2600);
      } else if (def === 'buzhou' && kind === 'ch8') {
        combat.spawnMonster('water_assassin', -10, -16);
        combat.spawnMonster('water_assassin', 10, -16);
        combat.spawnMonster('gonggong', 0, -34);
        tracker.showBanner('共工触山在即 · 决战!', 2600);
      }
      void pos;
    },
    combatEnemyCount: () => combat.enemies.filter((e) => e.alive).length,
  });
  directorRef = director;
  director.cameraRef = camera;
  director.bindInteractables();
  director.refreshEntities();
  spawnWildBeasts();

  bus.on('quest:completed', ({ id }) => {
    tracker.showBanner(`任务完成`, 2000);
    director.onQuestCompleted(id);
  });
  bus.on('world:teleport', ({ mapId, spawnId }) => {
    teleportTo(mapId, spawnId);
  });

  /* ---- 神祠存档菜单 ---- */
  const saveMenu = new SaveMenuUI(ui, save, {
    onSave: (slot) => {
      save.save(slot, playerBlob(), world.maps.def.id, saveBlobExtra());
      tracker.showBanner(`已存入档位 ${slot + 1}`, 1800);
    },
    onLoad: (slot) => {
      const data = save.load(slot);
      if (data) applySave(data);
    },
    onTeleport: (mapId) => {
      teleportTo(mapId);
    },
    canTeleport: () => {
      const cur = world.maps.def.id;
      if (cur === 'yaowang-valley') return { mapId: 'dahuang-city', label: '大荒城' };
      if (cur === 'dahuang-city') return { mapId: 'yaowang-valley', label: '药王谷' };
      return null;
    },
  });
  saveMenu.onClosed(() => {
    director.freezePlayer = false;
  });

  /* ---- 主循环 ---- */
  engine.renderer.info.autoReset = false;
  engine.onTick((dt, elapsed) => {
    engine.renderer.info.reset();
    state.playtimeSec += dt;
    progression.update(elapsed);
    achievements.checkRich(inventory.coins);
    achievements.checkAlchemy(alchemy.level);
    const interactPressed = input.consumePressed('interact');
    const dialogFrozen = dialogs.isOpen || cin.isPlaying || director.freezePlayer || panels.isOpen || saveMenu.isOpen;

    if (useDebugCam) debugCam.update(dt);
    else if (!cin.isPlaying) followCam.update(dt, world.player.position);

    combat.lastYaw = followCam.currentYaw;
    combat.update(dt, elapsed, dialogFrozen);

    // 技能前后摇锁定移动
    const combatLock = combat.executor.busy && combat.executor.activeState !== 'dodge';
    world.update(dt, elapsed, followCam.currentYaw, dialogFrozen || combatLock);

    director.update(dt, elapsed, interactPressed && !dialogFrozen);

    // 神兽:协战 + 捕捉交互(优先于 NPC 提示)
    beastHooks.playerAtk = combat.stats.block.atk;
    beastHooks.playerElement = combat.stats.block.element;
    beasts.update(dt, elapsed, world.player.position, world.player.heading, combat.enemies, beastHooks);
    if (!dialogFrozen) {
      const near = beasts.catchableNearby(combat.enemies, world.player.position);
      if (near) {
        prompt.show(`对 ${near.def.name} 使用缚灵索`);
        if (interactPressed) {
          if (inventory.countOf(CATCH_ITEM) > 0) {
            inventory.remove(CATCH_ITEM, 1);
            const res = beasts.tryCatch(near.enemy, 0.15); // 巫祝亲和 +15%
            tracker.showBanner(res.msg, 2400);
            panels.markDirty();
          } else {
            tracker.showBanner('没有缚灵索了(百草集有售)', 2200);
          }
        }
      }
    }

    postfx.render(dt);
    tween.update(dt);
    minimap.update(dt, world.player.position, world.player.heading, elapsed);
    tracker.update(dt);
    storyNav.update(state.chapter);
    hud.update(dt, combat.stats, combat.executor, combat.bossInfo);
    combat.hitfx.update(dt, 1280, 720);
    panels.update();
    f3.update(dt);
  });

  loading.setProgress(0.8, '预编译光影');
  await nextFrame();
  postfx.render(0);

  loading.setProgress(0.92, '召唤文墨');
  const fontSource = await ensureGameFonts();

  loading.setReady(async () => {
    await p.audio.unlock();
    loading.close();
    engine.start();
    await audio.init(); // BGM/SFX 就绪(失败静音降级)
    // 首次进入:操作提示(点击画面获取键盘焦点后即可行走)
    tracker.showBanner('先点击一下画面 · WASD/方向键移动 · E 交互 · J 攻击', 7000);
    // 嵌入式浏览器兜底:点击画布即取得键盘焦点
    p.platform.getSurface().addEventListener('pointerdown', () => window.focus());
    // 有自动档 → 自动续玩;否则新档开场运镜
    const auto = save.load(0);
    if (auto) {
      applySave(auto);
    } else {
      director.playOpening();
    }
    (globalThis as Record<string, unknown>)['__shanhai'] = {
      world,
      player: world.player,
      input,
      engine,
      quality,
      state,
      quests,
      director,
      save,
      combat,
      hud,
      inventory,
      equipment,
      progression,
      alchemy,
      panels,
      beasts,
      switchMap: (m: string, s: string) => world.switchMap(m, s),
    };
    console.info(
      `[大荒山海录] 启动完成 · 字体=${FONT_SOURCE_LABEL[fontSource]} · PAL=${p.platform.id} · ${auto ? '自动续档' : '新档开场'}`,
    );
  });
}

boot().catch((err: unknown) => {
  try {
    const loading = new LoadingScreen();
    const msg = err instanceof Error ? `${err.message}\n${(err.stack ?? '').split('\n').slice(1, 4).join('\n')}` : String(err);
    loading.showError(msg);
  } catch {
    // 加载页骨架缺失时退回 console
  }
  console.error('[大荒山海录] 启动失败', err);
});
