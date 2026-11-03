/**
 * 微信小游戏全局 API 最小类型声明(M9 POC:保证适配层编译通过;真机签名以官方 @types 为准)。
 */
declare const wx: {
  getSystemInfoSync(): {
    windowWidth: number;
    windowHeight: number;
    pixelRatio: number;
    platform: string;
  };
  onWindowResize(cb: (res: { windowWidth: number; windowHeight: number }) => void): void;
  offWindowResize(cb?: (res: { windowWidth: number; windowHeight: number }) => void): void;
  getStorageSync(key: string): { data: unknown };
  setStorageSync(key: string, data: unknown): void;
  removeStorageSync(key: string): void;
  getStorageInfoSync(): { keys: string[] };
  request(opts: {
    url: string;
    method?: string;
    data?: unknown;
    responseType?: string;
    success: (res: { data: unknown; statusCode: number }) => void;
    fail: (err: { errMsg: string }) => void;
  }): void;
  onTouchStart(cb: (e: WechatTouchEvent) => void): void;
  onTouchMove(cb: (e: WechatTouchEvent) => void): void;
  onTouchEnd(cb: (e: WechatTouchEvent) => void): void;
  onKeyDown?(cb: (e: { code: string }) => void): void;
  onKeyUp?(cb: (e: { code: string }) => void): void;
  vibrateShort(opts?: Record<string, unknown>): void;
  createInnerAudioContext(): WechatInnerAudio;
  onError(cb: (err: unknown) => void): void;
};

interface WechatTouchEvent {
  touches: { identifier: number; clientX: number; clientY: number }[];
  changedTouches: { identifier: number; clientX: number; clientY: number }[];
  timeStamp: number;
}

interface WechatInnerAudio {
  src: string;
  loop: boolean;
  volume: number;
  play(): void;
  stop(): void;
  destroy(): void;
  onEnded(cb: () => void): void;
}
