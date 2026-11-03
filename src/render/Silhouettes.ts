import * as THREE from 'three';
import { Noise2D, lerp } from '../core/Noise.js';

/**
 * 多层远山剪影:周期噪声山脊环带(fbm 谐波保证首尾无缝)。
 * 位置远超雾有效距离,故 fog=false 并按层数手工混入天空地平色。
 */

interface LayerSpec {
  radius: number;
  baseHeight: number;
  amp: number;
  /** 与地平雾色的混合比例(越远越淡) */
  hazeMix: number;
  seed: number;
}

const LAYERS: readonly LayerSpec[] = [
  { radius: 235, baseHeight: 13, amp: 11, hazeMix: 0.42, seed: 11 },
  { radius: 330, baseHeight: 21, amp: 17, hazeMix: 0.66, seed: 47 },
  { radius: 430, baseHeight: 30, amp: 24, hazeMix: 0.82, seed: 83 },
];

function buildRidge(spec: LayerSpec, horizonColor: THREE.Color, mountainColor: THREE.Color): THREE.Mesh {
  const SEG = 192;
  const positions: number[] = [];
  const indices: number[] = [];
  const noise = new Noise2D(spec.seed);
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * Math.PI * 2;
    const a1 = ((i + 1) / SEG) * Math.PI * 2;
    const h = (angle: number): number => {
      // 谐波组合,保证 2π 周期无缝
      let s = 0;
      s += Math.sin(angle * 3 + spec.seed) * 0.5;
      s += Math.sin(angle * 7 + spec.seed * 2.3) * 0.28;
      s += Math.sin(angle * 13 + spec.seed * 4.7) * 0.14;
      s += Math.sin(angle * 23 + spec.seed * 8.9) * 0.08;
      const n = noise.fbm(Math.cos(angle) * 1.4, Math.sin(angle) * 1.4, 3) * 0.6;
      return spec.baseHeight + (s * 0.72 + n) * spec.amp;
    };
    const x0 = Math.cos(a0) * spec.radius;
    const z0 = Math.sin(a0) * spec.radius;
    const x1 = Math.cos(a1) * spec.radius;
    const z1 = Math.sin(a1) * spec.radius;
    const base = positions.length / 3;
    positions.push(x0, h(a0), z0, x1, h(a1), z1, x0, -12, z0, x1, -12, z1);
    indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const color = mountainColor.clone().lerp(horizonColor, spec.hazeMix);
  const material = new THREE.MeshBasicMaterial({ color, fog: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -9;
  return mesh;
}

export class SilhouetteRing {
  readonly group = new THREE.Group();

  constructor(horizonColor: THREE.Color) {
    const nearMtn = new THREE.Color('#3c5a54');
    for (const spec of LAYERS) {
      this.group.add(buildRidge(spec, horizonColor, nearMtn));
    }
    // 山脚雾带:一环渐隐裙边,柔化剪影与地形衔接
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(LAYERS[0]!.radius, LAYERS[0]!.radius + 60, 26, 64, 1, true),
      new THREE.MeshBasicMaterial({
        color: horizonColor.clone().lerp(nearMtn, 0.25),
        transparent: true,
        opacity: 0.35,
        fog: false,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    skirt.position.y = -2;
    skirt.renderOrder = -8;
    this.group.add(skirt);
    void lerp;
  }
}
