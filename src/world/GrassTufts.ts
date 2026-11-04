import * as THREE from 'three';
import { mulberry32 } from '../core/Noise.js';

/**
 * 草地簇(M8+ 画质升级):InstancedMesh 三棱草叶,贴地散布;
 * 单 draw call,数量受预算约束。
 */
export class GrassTufts {
  readonly mesh: THREE.InstancedMesh;

  constructor(
    count: number,
    heightAt: (x: number, z: number) => number,
    slopeAt: (x: number, z: number) => number,
    boundsRadius: number,
    avoid: { x: number; z: number; r: number }[],
  ) {
    const blade = new THREE.ConeGeometry(0.035, 0.3, 4, 1);
    blade.translate(0, 0.15, 0);
    const material = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
    this.mesh = new THREE.InstancedMesh(blade, material, Math.max(1, count));
    this.mesh.receiveShadow = true;

    const rng = mulberry32(555222);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const axis = new THREE.Vector3(0, 1, 0);
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const cA = new THREE.Color('#4e7a45');
    const cB = new THREE.Color('#7a9a52');
    const c = new THREE.Color();
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < count * 20) {
      attempts++;
      const a = rng() * Math.PI * 2;
      const r = 6 + rng() * (boundsRadius - 12);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (slopeAt(x, z) > 0.5) continue;
      const y = heightAt(x, z);
      if (y < -0.5) continue;
      let blocked = false;
      for (const c2 of avoid) {
        if (Math.hypot(x - c2.x, z - c2.z) < c2.r) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      q.setFromAxisAngle(axis, rng() * Math.PI * 2);
      const sc = 0.7 + rng() * 0.9;
      s.set(sc, 0.7 + rng() * 0.9, sc);
      p.set(x, y - 0.02, z);
      m.compose(p, q, s);
      this.mesh.setMatrixAt(placed, m);
      c.copy(cA).lerp(cB, rng());
      this.mesh.setColorAt(placed, c);
      placed++;
    }
    this.mesh.count = Math.max(1, placed);
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
