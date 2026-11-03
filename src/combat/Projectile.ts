import * as THREE from 'three';
import { ObjectPool } from '../core/ObjectPool.js';

/**
 * 弹道池(PROMPT §4.7:弹道必须有池):玩家技能与怪物弹幕共用。
 * 命中由上层在 update 回调里判定。
 */

export interface Projectile {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  radius: number;
  color: string;
  poison?: { dps: number; dur: number };
  onHit: (pos: THREE.Vector3) => boolean;
  onExpire: (pos: THREE.Vector3) => void;
}

export class ProjectileSystem {
  private readonly pool = new ObjectPool<Projectile>(
    () => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 8, 6),
        new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      );
      mesh.visible = false;
      return {
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        radius: 0.5,
        color: '#fff',
        onHit: () => false,
        onExpire: () => {},
      };
    },
    (p) => {
      p.mesh.visible = false;
    },
    16,
  );
  private live: Projectile[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  spawn(opts: {
    pos: THREE.Vector3;
    dir: THREE.Vector3;
    speed: number;
    life: number;
    color: string;
    radius?: number;
    poison?: { dps: number; dur: number };
    onHit: (pos: THREE.Vector3) => boolean;
    onExpire?: (pos: THREE.Vector3) => void;
  }): void {
    const p = this.pool.acquire();
    p.mesh.position.copy(opts.pos);
    p.mesh.visible = true;
    (p.mesh.material as THREE.MeshBasicMaterial).color.set(opts.color);
    p.vel.copy(opts.dir).normalize().multiplyScalar(opts.speed);
    p.life = opts.life;
    p.radius = opts.radius ?? 0.5;
    p.color = opts.color;
    p.poison = opts.poison;
    p.onHit = opts.onHit;
    p.onExpire = opts.onExpire ?? (() => {});
    this.scene.add(p.mesh);
    this.live.push(p);
  }

  update(dt: number, elapsed: number): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i]!;
      p.life -= dt;
      const step = _v1.copy(p.vel).multiplyScalar(dt);
      p.mesh.position.add(step);
      p.mesh.rotation.y += dt * 8;
      let dead = p.life <= 0;
      if (!dead && p.onHit(p.mesh.position)) dead = true;
      if (dead) {
        p.onExpire(p.mesh.position);
        this.scene.remove(p.mesh);
        this.pool.release(p);
        this.live.splice(i, 1);
      }
    }
    void elapsed;
  }

  clear(): void {
    for (const p of this.live) {
      this.scene.remove(p.mesh);
      this.pool.release(p);
    }
    this.live = [];
  }
}

const _v1 = new THREE.Vector3();
