import './ui/theme.css';

import { EventBus } from './core/events.js';
import { Engine } from './core/Engine.js';
import { initPAL, pal } from './core/PAL/index.js';
import { InputManager } from './core/Input/InputManager.js';
import { ServiceKey, provide } from './core/Services.js';
import { PostFX } from './render/PostFX.js';
import { QualityManager } from './render/Quality.js';
import { DebugCamera } from './world/DebugCamera.js';
import { DemoValley } from './world/DemoValley.js';
import { ensureGameFonts, type FontSource } from './ui/FontManager.js';
import { F3Panel } from './ui/F3Panel.js';
import { LoadingScreen } from './ui/LoadingScreen.js';
import { UIRoot } from './ui/UIRoot.js';
import { TweenEngine } from './ui/framework/Tween.js';

const FONT_SOURCE_LABEL: Record<FontSource, string> = {
  subset: '本地子集',
  cdn: 'CDN 按需',
  system: '系统楷体',
};

/** 让出主线程,使加载进度条得以绘制 */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function boot(): Promise<void> {
  const bus = new EventBus();
  provide<EventBus>(ServiceKey.Bus, bus);
  const ui = new UIRoot();
  const loading = new LoadingScreen();
  const tween = new TweenEngine();
  void tween; // M0 面板动效走 CSS;数值补间自 M3 起由各系统使用

  loading.setProgress(0.06, '初始化平台层');
  const p = initPAL();
  const surface = p.platform.getSurface();
  const engine = new Engine(surface, bus);

  // 初始尺寸(PAL onResize 注册即回调一次)
  let winW = 1280;
  let winH = 720;
  let winDpr = 1;
  {
    const off = p.platform.onResize((w, h, dpr) => {
      winW = w;
      winH = h;
      winDpr = dpr;
    });
    off();
  }
  ui.resize(winW, winH); // 进游戏前舞台即正确缩放,避免加载页四周露边

  loading.setProgress(0.16, '雕凿山河');
  await nextFrame();
  const valley = new DemoValley();
  await nextFrame();

  loading.setProgress(0.62, '汇聚灵光');
  const postfx = new PostFX(engine.renderer, valley.scene, valley.camera, winW, winH);

  const quality = new QualityManager(bus);
  quality.bind({ renderer: engine.renderer, postfx, sunLight: valley.sunLight });

  // 尺寸事件 → UI 舞台 / 相机 / 后处理
  bus.on('engine:resize', ({ width, height }) => {
    ui.resize(width, height);
    valley.camera.aspect = width / height;
    valley.camera.updateProjectionMatrix();
    postfx.setSize(width, height);
  });

  const input = new InputManager(bus);
  provide<typeof input>(ServiceKey.Input, input);
  engine.onFrameEnd(() => input.endFrame());

  const debugCam = new DebugCamera(valley.camera, input);
  const f3 = new F3Panel(
    bus,
    {
      renderer: engine.renderer,
      time: engine.time,
      camera: valley.camera,
      quality: () => quality.current,
    },
    ui,
  );

  // composer 多 pass 下 info 会被逐 pass 重置;改为手动清零,累计整帧统计
  engine.renderer.info.autoReset = false;
  engine.onTick((dt, elapsed) => {
    engine.renderer.info.reset();
    debugCam.update(dt);
    valley.update(dt, elapsed);
    postfx.render(dt);
    tween.update(dt);
    f3.update(dt);
  });

  loading.setProgress(0.8, '预编译光影');
  await nextFrame();
  // 预热一帧:触发着色器编译,「入荒」后首帧无卡顿
  postfx.render(0);

  loading.setProgress(0.92, '召唤文墨');
  const fontSource = await ensureGameFonts();

  loading.setReady(async () => {
    await p.audio.unlock(); // 用户手势内解锁音频(后续 BGM/SFX 复用)
    loading.close();
    engine.start();
    console.info(
      `[大荒山海录] 启动完成 · 字体=${FONT_SOURCE_LABEL[fontSource]} · PAL=${p.platform.id}`,
    );
  });
}

boot().catch((err: unknown) => {
  // 加载页兜底:任何启动期错误直接呈现在加载页上
  try {
    const loading = new LoadingScreen();
    loading.showError(err instanceof Error ? err.message : String(err));
  } catch {
    // LoadingScreen 需要骨架存在;极端情况下退回 console
  }
  console.error('[大荒山海录] 启动失败', err);
});
