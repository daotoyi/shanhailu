/**
 * 轻量补间引擎:面板动效/飘字等共用;由 Engine tick 驱动。
 * DOM 后端也可直接用 CSS animation(面板开关即是),Tween 服务于数值动画。
 */

export type Easing = (t: number) => number;

export const Easing = {
  linear: (t: number) => t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
} as const;

interface TweenTask {
  elapsed: number;
  duration: number;
  ease: Easing;
  onUpdate: (t: number) => void;
  onComplete?: () => void;
  dead: boolean;
}

export class TweenEngine {
  private tasks: TweenTask[] = [];

  to(opts: {
    duration: number;
    ease?: Easing;
    onUpdate: (t: number) => void;
    onComplete?: () => void;
  }): () => void {
    const task: TweenTask = {
      elapsed: 0,
      duration: Math.max(0.0001, opts.duration),
      ease: opts.ease ?? Easing.outCubic,
      onUpdate: opts.onUpdate,
      onComplete: opts.onComplete,
      dead: false,
    };
    this.tasks.push(task);
    return () => {
      task.dead = true;
    };
  }

  update(dt: number): void {
    for (const task of this.tasks) {
      if (task.dead) continue;
      task.elapsed += dt;
      const raw = Math.min(1, task.elapsed / task.duration);
      task.onUpdate(task.ease(raw));
      if (raw >= 1) {
        task.dead = true;
        task.onComplete?.();
      }
    }
    if (this.tasks.some((t) => t.dead)) {
      this.tasks = this.tasks.filter((t) => !t.dead);
    }
  }

  clear(): void {
    this.tasks = [];
  }
}
