import * as THREE from 'three';

export interface CinematicKeyframe {
  /** 相机位(世界) */
  pos: [number, number, number];
  lookAt: [number, number, number];
  dur: number;
  ease?: 'linear' | 'inout';
}

export interface CinematicSubtitle {
  /** 相对起始秒 */
  at: number;
  dur: number;
  text: string;
}

export interface CinematicDef {
  id: string;
  keyframes: CinematicKeyframe[];
  subtitles?: CinematicSubtitle[];
  /** 结束时的效果指令(经 Director) */
  onEndActions?: string[];
}

/**
 * 引擎内运镜过场(PROMPT §3.2):关键帧相机 + 上下黑边 + 字幕。
 * 播放期间接管主相机;空格跳过。
 */
export class CinematicPlayer {
  private def: CinematicDef | null = null;
  private t = 0;
  private kfIndex = 0;
  private kfT = 0;
  private playing = false;
  private readonly letterbox: { top: HTMLDivElement; bottom: HTMLDivElement; sub: HTMLDivElement };
  private onDone: (() => void) | null = null;
  private actionHandler: (a: string) => void = () => {};
  private skipRequested = false;

  constructor(stage: { append(...nodes: HTMLElement[]): void }) {
    const mk = (h: number): HTMLDivElement => {
      const d = document.createElement('div');
      d.style.cssText = `position:absolute;left:0;right:0;height:${h}px;background:#0a0806;z-index:100;transition:transform 0.6s ease;`;
      return d;
    };
    const top = mk(70);
    top.style.top = '0';
    top.style.transform = 'translateY(-100%)';
    const bottom = mk(70);
    bottom.style.bottom = '0';
    bottom.style.transform = 'translateY(100%)';
    const sub = document.createElement('div');
    sub.style.cssText = [
      'position:absolute', 'left:50%', 'bottom:88px', 'transform:translateX(-50%)',
      'font-size:19px', 'letter-spacing:5px', 'color:#e8e2d3',
      'text-shadow:0 1px 4px #000', 'white-space:nowrap', 'z-index:101',
      'opacity:0', 'transition:opacity 0.4s ease',
    ].join(';');
    this.letterbox = { top, bottom, sub };
    stage.append(top, bottom, sub);
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  requestSkip(): void {
    if (this.playing) this.skipRequested = true;
  }

  bindActions(handler: (a: string) => void): void {
    this.actionHandler = handler;
  }

  play(def: CinematicDef, camera: THREE.PerspectiveCamera, onDone: () => void): void {
    this.def = def;
    this.t = 0;
    this.kfIndex = 0;
    this.kfT = 0;
    this.playing = true;
    this.skipRequested = false;
    this.onDone = onDone;
    this.letterbox.top.style.transform = 'translateY(0)';
    this.letterbox.bottom.style.transform = 'translateY(0)';
    // 立即摆到首帧
    const k0 = def.keyframes[0]!;
    camera.position.set(...k0.pos);
    camera.lookAt(_look.set(...k0.lookAt));
  }

  update(dt: number, camera: THREE.PerspectiveCamera, elapsed: number): void {
    if (!this.playing || !this.def) return;
    const def = this.def;

    // 字幕
    const sub = this.letterbox.sub;
    let active: CinematicSubtitle | null = null;
    for (const s of def.subtitles ?? []) {
      if (this.t >= s.at && this.t < s.at + s.dur) {
        active = s;
        break;
      }
    }
    if (active) {
      if (sub.textContent !== active.text) sub.textContent = active.text;
      sub.style.opacity = '1';
    } else {
      sub.style.opacity = '0';
    }

    // 关键帧推进
    this.kfT += dt;
    let kf = def.keyframes[this.kfIndex]!;
    if (this.kfT >= kf.dur) {
      this.kfT -= kf.dur;
      this.kfIndex++;
      if (this.kfIndex >= def.keyframes.length) {
        this.finish();
        return;
      }
      kf = def.keyframes[this.kfIndex]!;
    }
    const next = def.keyframes[Math.min(this.kfIndex + 1, def.keyframes.length - 1)]!;
    const raw = Math.min(1, this.kfT / kf.dur);
    const t = kf.ease === 'linear' ? raw : raw * raw * (3 - 2 * raw);
    const from = new THREE.Vector3(...kf.pos);
    const to = new THREE.Vector3(...next.pos);
    const lookFrom = new THREE.Vector3(...kf.lookAt);
    const lookTo = new THREE.Vector3(...next.lookAt);
    camera.position.lerpVectors(from, to, t);
    _look.lerpVectors(lookFrom, lookTo, t);
    camera.lookAt(_look);

    this.t += dt;

    if (this.skipRequested) this.finish();
    void elapsed;
  }

  private finish(): void {
    this.playing = false;
    this.letterbox.top.style.transform = 'translateY(-100%)';
    this.letterbox.bottom.style.transform = 'translateY(100%)';
    this.letterbox.sub.style.opacity = '0';
    const def = this.def;
    this.def = null;
    const cb = this.onDone;
    this.onDone = null;
    def?.onEndActions?.forEach((a) => this.actionHandler(a));
    cb?.();
  }
}

const _look = new THREE.Vector3();
