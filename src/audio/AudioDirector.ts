import type { EventBus } from '../core/events.js';
import { pal } from '../core/PAL/index.js';

/**
 * 音频总管(M8,PROMPT §3.14):全程序化合成(CC0,零资产)。
 * BGM:五声音阶古琴风琶音(地图切换换调);SFX:普攻/命中/技能/拾取/升级/成就/UI。
 * 音量三轨(主/BGM/SFX)经设置持久化。
 */
export class AudioDirector {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private bgmKey = 0;
  volumes = { master: 0.8, bgm: 0.5, sfx: 0.7 };

  constructor(private readonly bus: EventBus) {
    // SFX 事件
    bus.on('input:action', ({ action, phase }) => {
      if (phase !== 'start') return;
      if (action === 'attack') this.sfx('slash', 0.5);
      else if (action === 'skill1' || action === 'skill2' || action === 'skill3') this.sfx('skill', 0.6);
      else if (action === 'ult') this.sfx('ult', 0.9);
      else if (action === 'toggleBag' || action === 'toggleAlchemy') this.sfx('ui', 0.4);
    });
    bus.on('quest:completed', () => this.sfx('quest', 0.9));
    bus.on('prog:levelup', () => this.sfx('levelup', 1.0));
    bus.on('beast:caught', () => this.sfx('chime', 1.0));
    bus.on('world:teleport', () => this.sfx('teleport', 0.7));
    bus.on('world:respawn', () => this.sfx('chime', 0.8));
  }

  /** 用户手势后初始化(入荒点击) */
  async init(): Promise<void> {
    try {
      await pal().audio.unlock();
      const stored = pal().storage.get('dashan_audio');
      if (stored) {
        try {
          this.volumes = { ...this.volumes, ...JSON.parse(stored) };
        } catch { /* 忽略 */ }
      }
      // PAL.Audio 无裸 ctx 暴露:经 WebAudio 解码空缓冲触发建轨(实现细节见 PAL)
      const silent = await pal().audio.decode(new ArrayBuffer(1).byteLength ? new ArrayBuffer(44) : new ArrayBuffer(44));
      void silent;
      this.ensureGraph();
      this.startBgm();
    } catch (e) {
      console.warn('[Audio] 初始化降级(静音运行)', e);
    }
  }

  /** WebAudio 图(经由 PAL 解锁后的全局 ctx:PAL 实现内部单例) */
  private ensureGraph(): void {
    if (this.ctx) return;
    const AC = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext
      ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volumes.master;
    this.master.connect(this.ctx.destination);
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = this.volumes.bgm;
    this.bgmGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.volumes.sfx;
    this.sfxGain.connect(this.master);
  }

  setVolume(track: 'master' | 'bgm' | 'sfx', v: number): void {
    this.volumes[track] = Math.max(0, Math.min(1, v));
    if (this.master && track === 'master') this.master.gain.value = this.volumes.master;
    if (this.bgmGain && track === 'bgm') this.bgmGain.gain.value = this.volumes.bgm;
    if (this.sfxGain && track === 'sfx') this.sfxGain.gain.value = this.volumes.sfx;
    pal().storage.set('dashan_audio', JSON.stringify(this.volumes));
  }

  /** 地图换调 */
  setKey(key: number): void {
    this.bgmKey = key % 5;
  }

  /* ---------- 合成原语 ---------- */

  /** 古琴音:衰减正弦 + 二次泛音 */
  private pluck(freq: number, dur: number, gain: GainNode, vol = 0.5, when = 0): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2.01;
    const g = this.ctx.createGain();
    const g2 = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    g2.gain.setValueAtTime(vol * 0.22, t0);
    g2.gain.exponentialRampToValueAtTime(0.001, t0 + dur * 0.6);
    osc.connect(g).connect(gain);
    osc2.connect(g2).connect(gain);
    osc.start(t0);
    osc2.start(t0);
    osc.stop(t0 + dur + 0.05);
    osc2.stop(t0 + dur + 0.05);
  }

  private noiseBurst(dur: number, filterFreq: number, vol: number, when = 0): void {
    if (!this.ctx || !this.sfxGain) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(flt).connect(g).connect(this.sfxGain);
    src.start(t0);
  }

  /** 五声音阶(宫商角徵羽)频率 */
  private pentatonic(root: number, deg: number): number {
    const steps = [0, 2, 4, 7, 9];
    const oct = Math.floor(deg / 5);
    return root * Math.pow(2, (steps[((deg % 5) + 5) % 5]! + oct * 12) / 12);
  }

  /* ---------- BGM ---------- */

  private startBgm(): void {
    this.ensureGraph();
    if (!this.ctx || !this.bgmGain || this.bgmTimer !== null) return;
    const bgmGain = this.bgmGain;
    const beat = () => {
      if (!this.ctx) return;
      const root = 196 * Math.pow(2, this.bgmKey * 2 / 12); // 宫音随地图换调
      const deg = this.bgmStep;
      this.pluck(this.pentatonic(root, deg), 1.6, bgmGain, 0.34);
      if (this.bgmStep % 4 === 0) this.pluck(this.pentatonic(root, deg + 4), 2.2, bgmGain, 0.2, 0.24);
      if (this.bgmStep % 8 === 6) this.pluck(root / 2, 2.4, bgmGain, 0.26, 0.1);
      this.bgmStep++;
    };
    beat();
    this.bgmTimer = window.setInterval(beat, 1150);
  }

  stopBgm(): void {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  /* ---------- SFX ---------- */

  sfx(kind: 'slash' | 'hit' | 'skill' | 'ult' | 'ui' | 'quest' | 'levelup' | 'chime' | 'teleport' | 'pickup', vol = 0.8): void {
    this.ensureGraph();
    if (!this.ctx) return;
    const sfxGain = this.sfxGain;
    if (!sfxGain) return;
    switch (kind) {
      case 'slash':
        this.noiseBurst(0.12, 2600, 0.5 * vol);
        break;
      case 'hit':
        this.noiseBurst(0.08, 900, 0.6 * vol);
        this.pluck(120, 0.12, sfxGain, 0.4 * vol);
        break;
      case 'skill':
        this.pluck(520, 0.3, sfxGain, 0.4 * vol);
        this.noiseBurst(0.2, 1400, 0.3 * vol);
        break;
      case 'ult':
        for (let i = 0; i < 4; i++) this.pluck(this.pentatonic(392, i * 2), 0.9, sfxGain, 0.4 * vol, i * 0.09);
        this.noiseBurst(0.6, 700, 0.4 * vol, 0.3);
        break;
      case 'ui':
        this.pluck(880, 0.09, sfxGain, 0.24 * vol);
        break;
      case 'quest':
        [523, 659, 784].forEach((f, i) => this.pluck(f, 0.5, sfxGain, 0.4 * vol, i * 0.11));
        break;
      case 'levelup':
        [392, 523, 659, 1046].forEach((f, i) => this.pluck(f, 0.7, sfxGain, 0.42 * vol, i * 0.12));
        break;
      case 'chime':
        [1046, 1318].forEach((f, i) => this.pluck(f, 1.1, sfxGain, 0.36 * vol, i * 0.16));
        break;
      case 'teleport':
        this.noiseBurst(0.5, 500, 0.4 * vol);
        this.pluck(660, 0.8, sfxGain, 0.3 * vol, 0.15);
        break;
      case 'pickup':
        this.pluck(1318, 0.14, sfxGain, 0.3 * vol);
        break;
    }
  }
}
