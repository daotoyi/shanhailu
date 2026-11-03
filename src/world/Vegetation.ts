import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32, Noise2D } from '../core/Noise.js';
import type { Terrain } from './Terrain.js';
import { WATER_LEVEL } from './Terrain.js';

/** 需要避让的圆形区域(神祠/出生点) */
export interface Clearing {
  x: number;
  z: number;
  radius: number;
}

/** 地形采样接口(Terrain 与主题地图工厂共用) */
export interface TerrainSampler {
  height(x: number, z: number): number;
  slope(x: number, z: number): number;
  noise: Noise2D;
}

interface ScatterOptions {
  terrain: { height(x: number, z: number): number; slope(x: number, z: number): number };
  clearings: Clearing[];
  count: number;
  seed: number;
  /** 允许的海拔范围 */
  yMin: number;
  yMax: number;
  /** 允许的最大坡度 */
  maxSlope: number;
  /** 允许的半径范围(相对原点) */
  rMin: number;
  rMax: number;
}

interface Placed {
  x: number;
  z: number;
  y: number;
  rot: number;
  scale: number;
}

function scatter(opts: ScatterOptions): Placed[] {
  const rng = mulberry32(opts.seed);
  const out: Placed[] = [];
  let attempts = 0;
  while (out.length < opts.count && attempts < opts.count * 24) {
    attempts++;
    const a = rng() * Math.PI * 2;
    const r = lerpNum(opts.rMin, opts.rMax, rng());
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r - 4;
    const y = opts.terrain.height(x, z);
    if (y < opts.yMin || y > opts.yMax) continue;
    if (opts.terrain.slope(x, z) > opts.maxSlope) continue;
    if (y < WATER_LEVEL + 0.7) continue;
    let blocked = false;
    for (const c of opts.clearings) {
      if (Math.hypot(x - c.x, z - c.z) < c.radius) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    out.push({ x, z, y, rot: rng() * Math.PI * 2, scale: 0.75 + rng() * 0.6 });
  }
  return out;
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function setInstances(
  mesh: THREE.InstancedMesh,
  placements: Placed[],
  yOff: number,
  tintA: THREE.Color,
  tintB: THREE.Color,
  rng: () => number,
): void {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const axisY = new THREE.Vector3(0, 1, 0);
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const c = new THREE.Color();
  placements.forEach((pl, i) => {
    q.setFromAxisAngle(axisY, pl.rot);
    s.setScalar(pl.scale);
    p.set(pl.x, pl.y + yOff * pl.scale, pl.z);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
    c.copy(tintA).lerp(tintB, rng());
    mesh.setColorAt(i, c);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/**
 * 程序化植被与山石:松树 / 阔叶树 / 桃树 / 岩石,全部 InstancedMesh。
 * density/tint 参数化(M7 主题地图复用);记忆点辅助:桃树环绕神祠与水岸。
 */
export class Vegetation {
  readonly group = new THREE.Group();
  /** 本组产生的 draw call 数(自检用) */
  drawCalls = 0;

  constructor(sampler: TerrainSampler, clearings: Clearing[], density = 1, tint?: [string, string]) {
    const terrain = {
      height: (x: number, z: number) => sampler.height(x, z),
      slope: (x: number, z: number) => sampler.slope(x, z),
      noise: sampler.noise,
    };
    const rng = mulberry32(97001);
    let calls = 0;
    const N = (n: number) => Math.round(n * density);
    const pineTint = tint ?? ['#2e5943', '#4a7a50'];

    /* ---- 松树(高层坡地) ---- */
    const pines = scatter({
      terrain, clearings, count: N(260), seed: 101, yMin: WATER_LEVEL + 1.2, yMax: 30,
      maxSlope: 0.62, rMin: 14, rMax: 150,
    });
    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.26, 1.9, 6);
    trunkGeo.translate(0, 0.95, 0);
    const coneA = new THREE.ConeGeometry(1.25, 2.4, 7);
    coneA.translate(0, 2.8, 0);
    const coneB = new THREE.ConeGeometry(0.95, 2.0, 7);
    coneB.translate(0, 4.1, 0);
    const coneC = new THREE.ConeGeometry(0.6, 1.6, 7);
    coneC.translate(0, 5.2, 0);
    const pineFoliage = mergeGeometries([coneA, coneB, coneC])!;
    {
      const trunk = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: '#5d4632', flatShading: true, roughness: 1 }), Math.max(1, pines.length));
      const foliage = new THREE.InstancedMesh(pineFoliage, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), Math.max(1, pines.length));
      setInstances(trunk, pines, 0, new THREE.Color('#54402e'), new THREE.Color('#6b523a'), rng);
      setInstances(foliage, pines, 0, new THREE.Color(pineTint[0]), new THREE.Color(pineTint[1]), rng);
      trunk.castShadow = foliage.castShadow = true;
      this.group.add(trunk, foliage);
      calls += 2;
    }

    /* ---- 阔叶树(低地) ---- */
    const leafies = scatter({
      terrain, clearings, count: N(110), seed: 202, yMin: WATER_LEVEL + 0.9, yMax: 12,
      maxSlope: 0.5, rMin: 20, rMax: 130,
    });
    const blobA = new THREE.IcosahedronGeometry(1.5, 1);
    blobA.scale(1, 0.82, 1);
    blobA.translate(0, 3.4, 0);
    const blobB = new THREE.IcosahedronGeometry(1.05, 1);
    blobB.scale(1, 0.85, 1);
    blobB.translate(0.7, 2.6, 0.4);
    const leafCrown = mergeGeometries([blobA, blobB])!;
    {
      const trunk = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: '#63513a', flatShading: true, roughness: 1 }), Math.max(1, leafies.length));
      const crown = new THREE.InstancedMesh(leafCrown, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.92 }), Math.max(1, leafies.length));
      setInstances(trunk, leafies, 0, new THREE.Color('#584634'), new THREE.Color('#6e5940'), rng);
      setInstances(crown, leafies, 0, new THREE.Color('#557a48'), new THREE.Color('#77955a'), rng);
      trunk.castShadow = crown.castShadow = true;
      this.group.add(trunk, crown);
      calls += 2;
    }

    /* ---- 桃树(水岸点缀,记忆点) ---- */
    const peaches = scatter({
      terrain, clearings, count: N(46), seed: 303, yMin: WATER_LEVEL + 0.7, yMax: 6,
      maxSlope: 0.42, rMin: 16, rMax: 42,
    });
    {
      const trunk = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: '#6d4a38', flatShading: true, roughness: 1 }), Math.max(1, peaches.length));
      const blossom = new THREE.InstancedMesh(leafCrown, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.85 }), Math.max(1, peaches.length));
      setInstances(trunk, peaches, 0, new THREE.Color('#63422f'), new THREE.Color('#7a5138'), rng);
      setInstances(blossom, peaches, 0, new THREE.Color('#d98a94'), new THREE.Color('#f2c6c0'), rng);
      trunk.castShadow = blossom.castShadow = true;
      this.group.add(trunk, blossom);
      calls += 2;
    }

    /* ---- 岩石 ---- */
    const rocks = scatter({
      terrain, clearings, count: N(110), seed: 404, yMin: WATER_LEVEL - 2, yMax: 42,
      maxSlope: 0.9, rMin: 8, rMax: 165,
    });
    const rockGeo = new THREE.IcosahedronGeometry(1, 1);
    {
      const pos = rockGeo.attributes['position'] as THREE.BufferAttribute;
      const nz = new Noise2D(555);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const d = 1 + nz.fbm(x * 1.3, z * 1.3 + y, 2) * 0.38;
        pos.setXYZ(i, x * d, y * d * 0.78, z * d);
      }
      rockGeo.computeVertexNormals();
      const rocksMesh = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.95 }), Math.max(1, rocks.length));
      setInstances(rocksMesh, rocks, -0.25, new THREE.Color('#6f7468'), new THREE.Color('#8a8d7f'), rng);
      rocksMesh.castShadow = rocksMesh.receiveShadow = true;
      this.group.add(rocksMesh);
      calls += 1;
    }

    this.drawCalls = calls;
  }
}
