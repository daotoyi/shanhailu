/**
 * PAL —— 平台抽象层接口定义(M0 冻结,PROMPT §4.8)。
 * 游戏逻辑只允许经这些接口访问平台能力;
 * 宿主 API(document/localStorage/WebAudio/fetch 等)只允许出现在各平台实现包内。
 */

export type PlatformId = 'web' | 'wechat-minigame' | 'ios-app' | 'android-app';

/* ---------- Input ---------- */

export type PALPointerType = 'mouse' | 'touch' | 'pen';

export interface PALPointerEvent {
  type: 'down' | 'move' | 'up';
  pointerId: number;
  pointerType: PALPointerType;
  /** CSS 像素坐标(相对 surface) */
  x: number;
  y: number;
  button: number;
  /** 指针锁定态下的原生增量 / 未锁定时按下拖拽增量 */
  movementX: number;
  movementY: number;
}

export interface PALKeyEvent {
  /** KeyboardEvent.code(物理键) */
  code: string;
  type: 'down' | 'up';
  repeat: boolean;
}

export interface PALTouchEvent {
  type: 'start' | 'move' | 'end';
  /** 多点触控的每个触点 */
  points: { id: number; x: number; y: number }[];
}

export interface IPALInput {
  onKeyDown(cb: (e: PALKeyEvent) => void): () => void;
  onKeyUp(cb: (e: PALKeyEvent) => void): () => void;
  onPointer(cb: (e: PALPointerEvent) => void): () => void;
  onWheel(cb: (deltaY: number) => void): () => void;
  onTouch(cb: (e: PALTouchEvent) => void): () => void;
  requestPointerLock(): void;
  exitPointerLock(): void;
  get isPointerLocked(): boolean;
}

/* ---------- Storage ---------- */

export interface IPALStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
}

/* ---------- Audio ---------- */

export interface PALAudioBuffer {
  duration: number;
}

export interface PALAudioPlayer {
  play(loop?: boolean): void;
  stop(): void;
  setVolume(v: number): void;
  /** 播放自然结束回调(一次性) */
  onEnded(cb: () => void): void;
  dispose(): void;
}

export interface IPALAudio {
  /** 必须由用户手势触发一次(iOS/自动播放策略) */
  unlock(): Promise<void>;
  decode(data: ArrayBuffer): Promise<PALAudioBuffer>;
  createPlayer(buffer: PALAudioBuffer): PALAudioPlayer;
  setMasterVolume(v: number): void;
}

/* ---------- Network ---------- */

export interface IPALNetwork {
  fetchText(url: string): Promise<string>;
  fetchJSON<T>(url: string): Promise<T>;
  fetchBinary(url: string): Promise<ArrayBuffer>;
}

/* ---------- Platform ---------- */

export interface IPALPlatform {
  readonly id: PlatformId;
  readonly isTouch: boolean;
  /** 渲染表面(canvas);微信小游戏为 wx canvas */
  getSurface(): HTMLCanvasElement;
  onResize(cb: (width: number, height: number, dpr: number) => void): () => void;
  now(): number;
  vibrate(ms: number): void;
  share?(data: { title?: string; text?: string; url?: string }): Promise<void>;
}

/* ---------- 汇总 ---------- */

export interface PALBundle {
  input: IPALInput;
  storage: IPALStorage;
  audio: IPALAudio;
  network: IPALNetwork;
  platform: IPALPlatform;
}
