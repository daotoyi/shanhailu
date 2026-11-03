import type { IPALAudio, PALAudioBuffer, PALAudioPlayer } from '../types.js';

interface PlayerDeps {
  ctx: AudioContext;
  master: GainNode;
  buffer: AudioBuffer;
}

/**
 * WebAudio 实现。AudioContext 惰性创建,unlock() 必须由用户手势调用
 * (加载页「入荒」按钮即触发点)。真正的内容编排(轨道/混音)在 audio/ 层,
 * 本实现只承担平台能力。
 */
export class WebAudio implements IPALAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private masterVolume = 1;

  private ensure(): { ctx: AudioContext; master: GainNode } {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.masterVolume;
      this.master.connect(this.ctx.destination);
    }
    return { ctx: this.ctx, master: this.master! };
  }

  async unlock(): Promise<void> {
    const { ctx } = this.ensure();
    if (ctx.state === 'suspended') await ctx.resume();
  }

  async decode(data: ArrayBuffer): Promise<PALAudioBuffer> {
    const { ctx } = this.ensure();
    const buf = await ctx.decodeAudioData(data);
    return { duration: buf.duration, raw: buf } as PALAudioBuffer & { raw: AudioBuffer };
  }

  createPlayer(buffer: PALAudioBuffer): PALAudioPlayer {
    const { ctx, master } = this.ensure();
    const raw = (buffer as PALAudioBuffer & { raw?: AudioBuffer }).raw;
    if (!raw) throw new Error('[PAL.Audio] 非法音频缓冲(须来自 decode)');
    const gain = ctx.createGain();
    gain.connect(master);

    let source: AudioBufferSourceNode | null = null;
    let endedCb: (() => void) | null = null;

    return {
      play(loop = false) {
        this.stop();
        source = ctx.createBufferSource();
        source.buffer = raw;
        source.loop = loop;
        source.connect(gain);
        source.onended = () => {
          if (!loop) endedCb?.();
        };
        source.start();
      },
      stop() {
        if (source) {
          source.onended = null;
          try {
            source.stop();
          } catch {
            /* 已停止 */
          }
          source.disconnect();
          source = null;
        }
      },
      setVolume(v: number) {
        gain.gain.value = Math.max(0, Math.min(1, v));
      },
      onEnded(cb: () => void) {
        endedCb = cb;
      },
      dispose() {
        this.stop();
        gain.disconnect();
      },
    };
  }

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.masterVolume;
  }
}
