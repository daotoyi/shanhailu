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
import { DebugCamera } from './world/DebugCamera.js';
import { MAPS } from './data/maps.js';
import { ensureGameFonts, type FontSource } from './ui/FontManager.js';
import { F3Panel } from './ui/F3Panel.js';
import { LoadingScreen } from './ui/LoadingScreen.js';
import { Minimap } from './ui/Minimap.js';
import { TransitionOverlay } from './ui/TransitionOverlay.js';
import { UIRoot } from './ui/UIRoot.js';
import { TouchControls } from './ui/dom/TouchControls.js';
import { TweenEngine } from './ui/framework/Tween.js';

const FONT_SOURCE_LABEL: Record<FontSource, string> = {
  subset: '本地子集',
  cdn: 'CDN 按需',
  system: '系统楷体',
};

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
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

  loading.setProgress(0.16, '雕凿山河');
  await nextFrame();
  const input = new InputManager(bus);
  provide<typeof input>(ServiceKey.Input, input);
  const world = new World(input, bus, {
    onMapChanged: (mapId) => {
      const def = MAPS[mapId];
      if (def) console.info(`[地图] 进入 ${def.name} —— ${def.epigraph}`);
    },
  });
  await nextFrame();

  loading.setProgress(0.62, '汇聚灵光');
  // 主相机(世界组装层之外,由 main 持有;RenderPass/后处理/跟随相机共用)
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

  /* ---- 相机 ---- */
  const followCam = new FollowCamera(camera, input, world.heightAt);
  const debugCam = new DebugCamera(camera, input);
  let useDebugCam = false;
  bus.on('input:action', ({ action, phase }) => {
    if (action === 'toggleDebugCam' && phase === 'start') {
      useDebugCam = !useDebugCam;
      if (!useDebugCam) followCam.snapTo(world.player.position);
    }
  });
  followCam.snapTo(world.player.position);

  /* ---- UI ---- */
  const touch = new TouchControls(input, ui);
  void touch;
  const minimap = new Minimap(ui);
  minimap.setMap(world.maps.map);
  const transition = new TransitionOverlay(ui);
  const f3 = new F3Panel(
    bus,
    {
      renderer: engine.renderer,
      time: engine.time,
      camera,
      quality: () => quality.current,
      extra: () => `${world.maps.def.name} · ${useDebugCam ? '调试相机' : '跟随相机'}`,
    },
    ui,
  );

  /* ---- 传送流程(TransitionOverlay 遮罩期间切图) ---- */
  bus.on('world:teleport', ({ mapId, spawnId, label }) => {
    const def = MAPS[mapId];
    if (!def) return;
    transition.run(def.name, def.epigraph, () => {
      const pos = world.switchMap(mapId, spawnId);
      minimap.setMap(world.maps.map);
      followCam.snapTo(pos);
    });
    void label;
  });

  /* ---- 主循环 ---- */
  engine.renderer.info.autoReset = false;
  engine.onTick((dt, elapsed) => {
    engine.renderer.info.reset();
    if (useDebugCam) debugCam.update(dt);
    else followCam.update(dt, world.player.position);
    world.update(dt, elapsed, followCam.currentYaw);
    postfx.render(dt);
    tween.update(dt);
    minimap.update(dt, world.player.position, world.player.heading, elapsed);
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
    (globalThis as Record<string, unknown>)['__shanhai'] = {
      world,
      player: world.player,
      input,
      engine,
      quality,
      switchMap: (m: string, s: string) => world.switchMap(m, s),
    };
    console.info(
      `[大荒山海录] 启动完成 · 字体=${FONT_SOURCE_LABEL[fontSource]} · PAL=${p.platform.id}`,
    );
  });
}

boot().catch((err: unknown) => {
  try {
    const loading = new LoadingScreen();
    loading.showError(err instanceof Error ? err.message : String(err));
  } catch {
    // 加载页骨架缺失时退回 console
  }
  console.error('[大荒山海录] 启动失败', err);
});
