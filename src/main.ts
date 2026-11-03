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
  const loading = new LoadingScreen();
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
  bus.on('quest:kill', ({ monsterId }) => quests.progress('kill', monsterId));
  bus.on('world:respawn', () => {
    tracker.showBanner('香火护佑 · 神祠前醒来', 2000);
    followCam.snapTo(world.player.position);
  });
  combat.onPlayerDown = () => tracker.showBanner('力竭倒下……', 2200);

  /* ---- UI 层 ---- */
  const touch = new TouchControls(input, ui);
  void touch;
  const minimap = new Minimap(ui);
  minimap.setMap(world.maps.map);
  const transition = new TransitionOverlay(ui);
  const prompt = new InteractPrompt(ui);
  const tracker = new QuestTracker(ui, quests, bus);
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
    state.deserialize(data);
    quests.deserialize(data.quests);
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
    tracker.refresh();
  };

  const afterMapSwitch = (pos: THREE.Vector3): void => {
    minimap.setMap(world.maps.map);
    followCam.snapTo(pos);
    directorRef?.markChapterDirty();
    directorRef?.refreshEntities();
    directorRef?.bindInteractables();
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
      save.save(0, playerBlob(), world.maps.def.id);
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
    spawnWave: (kind) => {
      if (kind === 'clear') {
        combat.clearEnemies();
        return;
      }
      combat.clearEnemies();
      combat.spawnMonster('yigui', -6, -2);
      combat.spawnMonster('yigui', 10, -4);
      combat.spawnMonster('yigui_boss', 0, 14);
      tracker.showBanner('瘴母已现身于池塘之畔', 2400);
    },
  });
  directorRef = director;
  director.cameraRef = camera;
  director.bindInteractables();
  director.refreshEntities();

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
      save.save(slot, playerBlob(), world.maps.def.id);
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
    const interactPressed = input.consumePressed('interact');
    const dialogFrozen = dialogs.isOpen || cin.isPlaying || director.freezePlayer;

    if (useDebugCam) debugCam.update(dt);
    else if (!cin.isPlaying) followCam.update(dt, world.player.position);

    combat.lastYaw = followCam.currentYaw;
    combat.update(dt, elapsed, dialogFrozen);

    // 技能前后摇锁定移动
    const combatLock = combat.executor.busy && combat.executor.activeState !== 'dodge';
    world.update(dt, elapsed, followCam.currentYaw, dialogFrozen || combatLock);

    director.update(dt, elapsed, interactPressed && !dialogFrozen);
    postfx.render(dt);
    tween.update(dt);
    minimap.update(dt, world.player.position, world.player.heading, elapsed);
    tracker.update(dt);
    hud.update(dt, combat.stats, combat.executor, combat.bossInfo);
    combat.hitfx.update(dt, 1280, 720);
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
