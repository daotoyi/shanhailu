import * as THREE from 'three';
import { Noise2D, lerp, smoothstep } from '../core/Noise.js';

/** 水面高度(全局基准,地形/植被/场景共用) */
export const WATER_LEVEL = -1.05;

/**
 * 山谷地形:fBm 丘陵 + 环形山脊围合 + 池塘盆地 + 出生整平;
 * 顶点色分区(草/砂岸/岩坡/高山岩),flatShading 风格化面片。
 */
export class Terrain {
  readonly mesh: THREE.Mesh;
  readonly noise = new Noise2D(20240601);

  constructor(size = 320, segments = 190) {
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes['position'] as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const cGrassA = new THREE.Color('#4e7a55');
    const cGrassB = new THREE.Color('#6f8f5e');
    const cGrassC = new THREE.Color('#3e6b4c');
    const cSand = new THREE.Color('#9c8a62');
    const cRock = new THREE.Color('#7a7d72');
    const cHigh = new THREE.Color('#8c8f84');
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = this.height(x, z);
      pos.setY(i, h);
    }
    geometry.computeVertexNormals();
    const nrm = geometry.attributes['normal'] as THREE.BufferAttribute;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = pos.getY(i);
      const slope = 1 - nrm.getY(i);
      // 草地三色随噪声混合
      const g = this.noise.fbm(x * 0.06, z * 0.06, 2);
      tmp.copy(cGrassA);
      if (g > 0.12) tmp.lerp(cGrassB, Math.min(1, g * 2));
      else if (g < -0.18) tmp.lerp(cGrassC, Math.min(1, -g * 2.4));
      // 砂岸(水线附近)
      const sandT = 1 - smoothstep(WATER_LEVEL - 0.15, WATER_LEVEL + 0.9, h);
      tmp.lerp(cSand, sandT);
      // 岩坡
      tmp.lerp(cRock, smoothstep(0.28, 0.55, slope));
      // 高山岩
      tmp.lerp(cHigh, smoothstep(24, 40, h) * 0.8);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.96,
      metalness: 0,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.receiveShadow = true;
    this.mesh.name = 'terrain';
  }

  /** 地形高度函数(生成与查询共用) */
  height(x: number, z: number): number {
    let h = this.noise.fbm(x * 0.012, z * 0.012, 4) * 5.5;
    h += this.noise.fbm(x * 0.045 + 7, z * 0.045 + 3, 3) * 1.1;
    // 环形山脊围合山谷
    const r = Math.hypot(x, z - 4);
    const rim = smoothstep(72, 128, r);
    h += rim * rim * (36 + 16 * this.noise.fbm(x * 0.02 + 31, z * 0.02 + 17, 3));
    // 池塘盆地(中心 0,8)
    const pd = Math.hypot(x, z - 8);
    const pond = 1 - smoothstep(9.5, 15.5, pd);
    h = lerp(h, -3.6, pond);
    // 出生整平(中心 0,-16)
    const sd = Math.hypot(x, z + 16);
    const flat = (1 - smoothstep(6, 15, sd)) * 0.8;
    h = lerp(h, 1.1, flat);
    return h;
  }

  /** 坡度 0~1(1 为竖直),供散布决策 */
  slope(x: number, z: number): number {
    const e = 0.9;
    const hx = this.height(x + e, z) - this.height(x - e, z);
    const hz = this.height(x, z + e) - this.height(x, z - e);
    return Math.min(1, Math.hypot(hx / (2 * e), hz / (2 * e)));
  }
}
