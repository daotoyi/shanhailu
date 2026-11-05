import * as THREE from 'three';
import { ObjectPool } from '../core/ObjectPool.js';
import type { FollowCamera } from '../world/FollowCamera.js';

/**
 * 打击反馈三件套(PROMPT §3.5):
 * ① 伤害飘字(对象池,世界坐标投影到 UI)② hitstop(全局 timeScale)③ 镜头微震(FollowCamera)。
 * 飘字 DOM 在 ui 层经回调上屏;本类负责池与生命周期。
 */

export interface FloatText {
  el: HTMLDivElement;
  worldPos: THREE.Vector3;
  vy: number;
  life: number;
  maxLife: number;
}

export class HitFX {
  private readonly pool: ObjectPool<FloatText>;
  private live: FloatText[] = [];
  /** hitstop 剩余秒(命中停顿) */
  private stopLeft = 0;

  constructor(
    private readonly stage: { append(node: HTMLElement): void },
    private readonly camera: THREE.PerspectiveCamera,
    private readonly follow: FollowCamera,
  ) {
    // 池预热需 stage 就绪,故在构造体内创建(字段初始化器早于参数属性赋值)
    this.pool = new ObjectPool<FloatText>(
      () => {
        const el = document.createElement('div');
        el.style.cssText = 'position:absolute;pointer-events:none;font-weight:700;z-index:75;text-shadow:0 1px 3px #000;will-change:transform,opacity;';
        stage.append(el);
        return { el, worldPos: new THREE.Vector3(), vy: 0, life: 0, maxLife: 0.9 };
      },
      (t) => {
        t.el.style.display = 'none';
        t.life = 0;
      },
      24,
    );
  }

  /** 全局时间缩放:hitstop 期间压到 0.08 */
  getTimeScale(): number {
    return this.stopLeft > 0 ? 0.08 : 1;
  }

  hitstop(duration = 0.07): void {
    this.stopLeft = Math.max(this.stopLeft, duration);
  }

  shake(amount: number): void {
    this.follow.addShake(amount);
  }

  /** 切图/读档时清空在途飘字,避免旧场景的数字残留上屏 */
  clear(): void {
    for (const t of this.live) this.pool.release(t);
    this.live.length = 0;
    this.stopLeft = 0;
  }

  /** 伤害飘字;crit/克制 加色放大 */
  floatDamage(worldPos: THREE.Vector3, amount: number, opts: { crit?: boolean; elementMul?: number; dodged?: boolean; heal?: boolean } = {}): void {
    const t = this.pool.acquire();
    t.worldPos.copy(worldPos).add(_up.set(0, 1.7, 0));
    t.life = t.maxLife = opts.crit ? 1.05 : 0.85;
    t.vy = 2.4;
    const el = t.el;
    el.style.display = 'block';
    if (opts.dodged) {
      el.textContent = '闪避';
      el.style.color = '#9fb8c8';
      el.style.fontSize = '14px';
    } else if (opts.heal) {
      el.textContent = `+${amount}`;
      el.style.color = '#8fe0a8';
      el.style.fontSize = '17px';
    } else {
      el.textContent = String(amount);
      const em = opts.elementMul ?? 1;
      el.style.color = opts.crit ? '#ffd45e' : em > 1 ? '#a8ffc8' : em < 1 ? '#b8b0a0' : '#f0ece0';
      el.style.fontSize = opts.crit ? '24px' : '16px';
    }
    el.style.opacity = '1';
    this.live.push(t);
  }

  update(dt: number, stageW: number, stageH: number): void {
    if (this.stopLeft > 0) this.stopLeft -= dt;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const t = this.live[i]!;
      t.life -= dt;
      if (t.life <= 0) {
        this.pool.release(t);
        this.live.splice(i, 1);
        continue;
      }
      t.worldPos.y += t.vy * dt;
      t.vy -= 2.2 * dt;
      _proj.copy(t.worldPos).project(this.camera);
      const x = (_proj.x * 0.5 + 0.5) * stageW;
      const y = (-_proj.y * 0.5 + 0.5) * stageH;
      t.el.style.transform = `translate(${x - 20}px, ${y - 20}px)`;
      t.el.style.opacity = String(Math.min(1, t.life / (t.maxLife * 0.4)));
    }
  }
}

const _up = new THREE.Vector3();
const _proj = new THREE.Vector3();
