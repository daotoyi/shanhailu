import type { PALBundle, IPALInput, IPALStorage, IPALAudio, IPALNetwork, IPALPlatform, PALKeyEvent, PALPointerEvent, PALTouchEvent, PALAudioBuffer, PALAudioPlayer, PlatformId } from '../types.js';

/**
 * 微信小游戏 PAL 实现(M9 POC,代码级可运行;真机联调按 docs/WECHAT.md)。
 * 无 DOM:输入走 wx 触摸/按键;存储走 wx 同步存储;网络走 wx.request;
 * 音频走 wx.createInnerAudioContext(无 decodeAudioData,BGM/SFX 需预转 mp3 清单)。
 */

export function createWechatPAL(): PALBundle {
  const sys = wx.getSystemInfoSync();
  const platform = new WechatPlatform(sys);
  return {
    platform,
    input: new WechatInput(),
    storage: new WechatStorage(),
    audio: new WechatAudio(),
    network: new WechatNetwork(),
  };
}

class WechatPlatform implements IPALPlatform {
  readonly id: PlatformId = 'wechat-minigame';
  readonly isTouch = true;
  private canvas: HTMLCanvasElement | null = null;

  constructor(private sys: ReturnType<typeof wx.getSystemInfoSync>) {}

  /** 小游戏环境由 three-platformize 注入全局 canvas */
  getSurface(): HTMLCanvasElement {
    if (!this.canvas) {
      const g = globalThis as { canvas?: HTMLCanvasElement };
      if (!g.canvas) throw new Error('[PAL.wechat] 全局 canvas 缺失(three-platformize 注入)');
      this.canvas = g.canvas;
    }
    return this.canvas;
  }

  onResize(cb: (w: number, h: number, dpr: number) => void): () => void {
    const fn = (res: { windowWidth: number; windowHeight: number }) =>
      cb(res.windowWidth, res.windowHeight, this.sys.pixelRatio);
    wx.onWindowResize(fn);
    cb(this.sys.windowWidth, this.sys.windowHeight, this.sys.pixelRatio);
    return () => wx.offWindowResize(fn);
  }

  now(): number {
    return Date.now();
  }

  vibrate(ms: number): void {
    void ms;
    wx.vibrateShort({});
  }
}

class WechatInput implements IPALInput {
  private keyHandlers = new Set<(e: PALKeyEvent) => void>();
  private pointerHandlers = new Set<(e: PALPointerEvent) => void>();
  private touchHandlers = new Set<(e: PALTouchEvent) => void>();

  constructor() {
    wx.onTouchStart((e) => this.fireTouch('start', e));
    wx.onTouchMove((e) => this.fireTouch('move', e));
    wx.onTouchEnd((e) => this.fireTouch('end', e));
    wx.onKeyDown?.((e) => this.keyHandlers.forEach((cb) => cb({ code: e.code, type: 'down', repeat: false })));
    wx.onKeyUp?.((e) => this.keyHandlers.forEach((cb) => cb({ code: e.code, type: 'up', repeat: false })));
  }

  private fireTouch(type: 'start' | 'move' | 'end', e: WechatTouchEvent): void {
    const points = e.touches.map((t) => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
    this.touchHandlers.forEach((cb) => cb({ type, points }));
    // 统一为指针事件(单点)
    const src = type === 'end' ? e.changedTouches[0] : e.touches[0];
    if (src) {
      this.pointerHandlers.forEach((cb) =>
        cb({ type: type === 'start' ? 'down' : type === 'end' ? 'up' : 'move', pointerId: src.identifier, pointerType: 'touch', x: src.clientX, y: src.clientY, button: 0, movementX: 0, movementY: 0 }));
    }
  }

  onKeyDown(cb: (e: PALKeyEvent) => void): () => void {
    this.keyHandlers.add(cb);
    return () => this.keyHandlers.delete(cb);
  }

  onKeyUp(cb: (e: PALKeyEvent) => void): () => void {
    this.keyHandlers.add(cb);
    return () => this.keyHandlers.delete(cb);
  }

  onPointer(cb: (e: PALPointerEvent) => void): () => void {
    this.pointerHandlers.add(cb);
    return () => this.pointerHandlers.delete(cb);
  }

  onWheel(_cb: (deltaY: number) => void): () => void {
    return () => {}; // 小游戏无滚轮
  }

  onTouch(cb: (e: PALTouchEvent) => void): () => void {
    this.touchHandlers.add(cb);
    return () => this.touchHandlers.delete(cb);
  }

  requestPointerLock(): void {}
  exitPointerLock(): void {}
  get isPointerLocked(): boolean {
    return false;
  }
}

class WechatStorage implements IPALStorage {
  get(key: string): string | null {
    try {
      const r = wx.getStorageSync(key);
      return typeof r.data === 'string' ? r.data : null;
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    wx.setStorageSync(key, value);
  }

  remove(key: string): void {
    wx.removeStorageSync(key);
  }

  keys(): string[] {
    return wx.getStorageInfoSync().keys;
  }
}

class WechatAudio implements IPALAudio {
  private masterVolume = 1;
  private ctxVolume = 1;

  async unlock(): Promise<void> {
    // 小游戏无自动播放限制;保留空实现
  }

  async decode(_data: ArrayBuffer): Promise<PALAudioBuffer> {
    throw new Error('[PAL.wechat] 小游戏无 decodeAudioData:请改用预转 mp3 清单 + createPlayerByPath(M9 真机接入)');
  }

  createPlayer(buffer: PALAudioBuffer): PALAudioPlayer {
    void buffer;
    throw new Error('[PAL.wechat] 请用 createPlayerByPath');
  }

  /** 路径播放(mp3 预转清单) */
  createPlayerByPath(path: string): PALAudioPlayer {
    const ctx = wx.createInnerAudioContext();
    ctx.src = path;
    let vol = 1;
    return {
      play(loop = false) {
        ctx.loop = loop;
        ctx.volume = vol * ctxVolumeProxy.v;
        ctx.play();
      },
      stop() {
        ctx.stop();
      },
      setVolume(v: number) {
        vol = v;
        ctx.volume = v * ctxVolumeProxy.v;
      },
      onEnded(cb: () => void) {
        ctx.onEnded(cb);
      },
      dispose() {
        ctx.destroy();
      },
    };
  }

  setMasterVolume(v: number): void {
    this.masterVolume = v;
    ctxVolumeProxy.v = v * this.ctxVolume;
    void this.masterVolume;
  }
}

/** 简化:全局音量桥(POC) */
const ctxVolumeProxy = { v: 1 };

class WechatNetwork implements IPALNetwork {
  private request(url: string, responseType?: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      wx.request({
        url,
        responseType,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
          else reject(new Error(`[PAL.wechat] HTTP ${res.statusCode} ${url}`));
        },
        fail: (err) => reject(new Error(`[PAL.wechat] ${err.errMsg}`)),
      });
    });
  }

  async fetchText(url: string): Promise<string> {
    return (await this.request(url, 'text')) as string;
  }

  async fetchJSON<T>(url: string): Promise<T> {
    return (await this.request(url, 'json')) as T;
  }

  async fetchBinary(url: string): Promise<ArrayBuffer> {
    return (await this.request(url, 'arraybuffer')) as ArrayBuffer;
  }
}
