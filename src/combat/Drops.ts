import * as THREE from 'three';
import { ObjectPool } from '../core/ObjectPool.js';

export type DropKind = 'coin' | 'herb';

export interface DropItem {
  mesh: THREE.Mesh;
  kind: DropKind;
  amount: number;
  vel: THREE.Vector3;
  grounded: boolean;
  magnet: boolean;
  life: number;
}

/** 掉落物(贝币/药材):弹跳落地 → 靠近磁吸 → 拾取事件 */
export class DropSystem {
  private readonly pool = new ObjectPool<DropItem>(
    () => {
      const geo = new THREE.IcosahedronGeometry(0.14, 0);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#c9a25c', emissive: '#8a6a2c', emissiveIntensity: 0.6, flatShading: true }));
      mesh.visible = false;
      return { mesh, kind: 'coin', amount: 1, vel: new THREE.Vector3(), grounded: false, magnet: false, life: 0 };
    },
    (d) => {
      d.mesh.visible = false;
    },
    24,
  );
  private live: DropItem[] = [];

  constructor(
    private readonly scene: THREE.Scene,
    private readonly heightAt: (x: number, z: number) => number,
  ) {}

  spawn(pos: THREE.Vector3, kind: DropKind, amount: number): void {
    const d = this.pool.acquire();
    d.kind = kind;
    d.amount = amount;
    d.mesh.position.copy(pos).add(_up.set(0, 0.8, 0));
    d.mesh.visible = true;
    (d.mesh.material as THREE.MeshStandardMaterial).color.set(kind === 'coin' ? '#c9a25c' : '#5fd2a0');
    (d.mesh.material as THREE.MeshStandardMaterial).emissive.set(kind === 'coin' ? '#8a6a2c' : '#2f8a60');
    d.vel.set((Math.random() - 0.5) * 3, 3 + Math.random() * 2, (Math.random() - 0.5) * 3);
    d.grounded = false;
    d.magnet = false;
    d.life = 30;
    this.scene.add(d.mesh);
    this.live.push(d);
  }

  /** 返回本帧拾取到的(种类,数量)列表 */
  update(dt: number, playerPos: THREE.Vector3, elapsed: number): { kind: DropKind; amount: number }[] {
    const picked: { kind: DropKind; amount: number }[] = [];
    for (let i = this.live.length - 1; i >= 0; i--) {
      const d = this.live[i]!;
      d.life -= dt;
      const dx = playerPos.x - d.mesh.position.x;
      const dz = playerPos.z - d.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (!d.magnet && dist < 2.3) d.magnet = true;
      if (d.magnet) {
        const pull = 9 * dt;
        d.mesh.position.x += (dx / (dist + 1e-4)) * pull;
        d.mesh.position.z += (dz / (dist + 1e-4)) * pull;
        d.mesh.position.y += (playerPos.y + 0.9 - d.mesh.position.y) * 5 * dt;
        if (dist < 0.45) {
          picked.push({ kind: d.kind, amount: d.amount });
          this.remove(i);
          continue;
        }
      } else if (!d.grounded) {
        d.vel.y -= 9.8 * dt;
        d.mesh.position.addScaledVector(d.vel, dt);
        const ground = this.heightAt(d.mesh.position.x, d.mesh.position.z) + 0.14;
        if (d.mesh.position.y <= ground) {
          d.mesh.position.y = ground;
          d.grounded = true;
        }
      } else {
        d.mesh.position.y = this.heightAt(d.mesh.position.x, d.mesh.position.z) + 0.14 + Math.sin(elapsed * 3 + i) * 0.05;
        d.mesh.rotation.y += dt * 2.4;
      }
      if (d.life <= 0) this.remove(i);
    }
    return picked;
  }

  private remove(i: number): void {
    const d = this.live[i]!;
    this.scene.remove(d.mesh);
    this.pool.release(d);
    this.live.splice(i, 1);
  }

  clear(): void {
    while (this.live.length > 0) this.remove(0);
  }
}

const _up = new THREE.Vector3();
