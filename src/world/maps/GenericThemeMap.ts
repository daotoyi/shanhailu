import * as THREE from 'three';
import { Noise2D } from '../../core/Noise.js';
import { Water } from '../../render/Water.js';
import { buildTeleporterPad, buildLanternPost, bakeMinimap } from '../structures.js';
import { Vegetation } from '../Vegetation.js';
import { mulberry32 } from '../../core/Noise.js';
import type { BuiltMap, BuiltTeleporter, MapCollider, MapDefinition, MapEnvironment } from './types.js';

export interface ThemeSpec {
  id: string;
  name: string;
  epigraph: string;
  boundsRadius: number;
  env: MapEnvironment;
  /** 地形起伏强度 */
  terrainAmp: number;
  terrainBase: number;
  /** 中央水面半径(0 = 无) */
  waterRadius: number;
  waterPos: [number, number];
  groundColors: [string, string];
  /** 植被密度(0 = 无) */
  treeDensity: number;
  treeTint: [string, string];
  /** 小地图主色 */
  minimapGround: [number, number, number];
  /** 传送链:来向/去向 */
  prevMap?: string;
  nextMap?: string;
  nextLabel?: string;
  /** 额外地标(由章节 def 提供) */
  decorate: (built: ThemeBuiltMap) => void;
  /** 怪物波(任务触发时) */
  bossId: string;
  bossPos: [number, number];
  minions: { id: string; pos: [number, number] }[];
}

export interface ThemeBuiltMap extends Omit<BuiltMap, 'minimap'> {
  minimap: BuiltMap['minimap'];
  spec: ThemeSpec;
  terrain: { height(x: number, z: number): number; slope(x: number, z: number): number };
  addCollider(c: MapCollider): void;
  noise: Noise2D;
  rng: () => number;
}

/**
 * 通用主题地图工厂(M7 内容采样):一套代码,七章参数化。
 * 地形(主题色/起伏/水面)+ 植被 + 传送阵 + 章节地标(decorate 钩子)。
 */
export function buildThemeMap(spec: ThemeSpec): BuiltMap {
  const noise = new Noise2D(hashId(spec.id));
  const rng = mulberry32(hashId(spec.id) * 7 + 13);
  const group = new THREE.Group();
  const colliders: MapCollider[] = [];
  const teleporters: BuiltTeleporter[] = [];
  const dynamics: ((elapsed: number) => void)[] = [];
  const waters: Water[] = [];
  let heightFn: (x: number, z: number) => number = () => 0;
  let slopeFn: (x: number, z: number) => number = () => 0;

  /* ---- 地形 ---- */
  const SIZE = spec.boundsRadius * 2 + 60;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, 110, 110);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes['position'] as THREE.BufferAttribute;
  heightFn = (x, z) => {
    let h = spec.terrainBase + noise.fbm(x * 0.014, z * 0.014, 4) * spec.terrainAmp;
    const r = Math.hypot(x, z);
    const rim = smooth(r * 0.9, spec.boundsRadius * 0.72, spec.boundsRadius * 1.02);
    h += rim * rim * (30 + 10 * noise.fbm(x * 0.02 + 9, z * 0.02, 3));
    if (spec.waterRadius > 0) {
      const wd = Math.hypot(x - spec.waterPos[0], z - spec.waterPos[1]);
      const pond = 1 - smooth(wd, spec.waterRadius * 0.7, spec.waterRadius * 1.1);
      h = h * (1 - pond) + (spec.terrainBase - 3.2) * pond;
    }
    return h;
  };
  slopeFn = (x, z) => {
    const e = 1.0;
    const hx = heightFn(x + e, z) - heightFn(x - e, z);
    const hz = heightFn(x, z + e) - heightFn(x, z - e);
    return Math.min(1, Math.hypot(hx / (2 * e), hz / (2 * e)));
  };
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightFn(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  const colors = new Float32Array(pos.count * 3);
  const cA = new THREE.Color(spec.groundColors[0]);
  const cB = new THREE.Color(spec.groundColors[1]);
  const tmp = new THREE.Color();
  const nrm = geo.attributes['normal'] as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const g = noise.fbm(pos.getX(i) * 0.06, pos.getZ(i) * 0.06, 2);
    tmp.copy(cA).lerp(cB, Math.min(1, Math.max(0, g + 0.5)));
    const slope = 1 - nrm.getY(i);
    tmp.lerp(new THREE.Color('#7a7d72'), Math.min(1, Math.max(0, (slope - 0.3) * 2)));
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.96 }));
  ground.receiveShadow = true;
  group.add(ground);

  /* ---- 水面 ---- */
  if (spec.waterRadius > 0) {
    const water = new Water({
      radius: spec.waterRadius,
      position: new THREE.Vector3(spec.waterPos[0], spec.terrainBase - 1.05, spec.waterPos[1]),
      sunDir: new THREE.Vector3(...spec.env.sunDir).normalize(),
      fogColor: new THREE.Color(spec.env.fogColor),
    });
    group.add(water.mesh);
    waters.push(water);
    dynamics.push((e) => water.update(e));
  }

  /* ---- 植被 ---- */
  if (spec.treeDensity > 0) {
    const veg = new Vegetation(
      { height: heightFn, slope: slopeFn, noise } as never,
      [],
      spec.treeDensity,
      spec.treeTint,
    );
    group.add(veg.group);
  }

  /* ---- 传送阵(来向记录;去向到 nextMap) ---- */
  const pad = buildTeleporterPad();
  pad.group.position.set(0, heightFn(0, spec.boundsRadius * 0.42) + 0.1, spec.boundsRadius * 0.42);
  group.add(pad.group);
  dynamics.push((e) => {
    pad.ring.rotation.y = e * 0.6;
    pad.runeMat.emissiveIntensity = 1.6 + Math.sin(e * 2.2) * 0.5;
  });
  if (spec.nextMap) {
    teleporters.push({
      id: `to-${spec.nextMap}`,
      pos: new THREE.Vector2(0, spec.boundsRadius * 0.42),
      radius: 2.0,
      targetMapId: spec.nextMap,
      targetSpawnId: 'entry',
      label: spec.nextLabel ?? '',
      group: pad.group,
      update: () => {},
    });
  }
  // 回城门(M7:东翼,回大荒城补给)
  if (spec.prevMap) {
    const rpad = buildTeleporterPad();
    const rx = spec.boundsRadius * 0.52;
    const rz = -spec.boundsRadius * 0.24;
    rpad.group.position.set(rx, heightFn(rx, rz) + 0.1, rz);
    group.add(rpad.group);
    dynamics.push((e) => {
      rpad.ring.rotation.y = e * 0.6;
      rpad.runeMat.emissiveIntensity = 1.6 + Math.sin(e * 2.2) * 0.5;
    });
    teleporters.push({
      id: `back-${spec.id}`,
      pos: new THREE.Vector2(rx, rz),
      radius: 2.0,
      targetMapId: 'dahuang-city',
      targetSpawnId: 'from-frontier',
      label: '大荒城',
      group: rpad.group,
      update: () => {},
    });
  }

  // 入口灯柱
  group.add(buildLanternPost(3.4, spec.boundsRadius * 0.42 - 3.2, spec.env.sunColor));
  colliders.push({ x: 3.4, z: spec.boundsRadius * 0.42 - 3.2, r: 0.4 });

  /* ---- 章节地标(钩子) ---- */
  const built: ThemeBuiltMap = {
    spec,
    group,
    heightAt: (x, z) => heightFn(x, z),
    colliders,
    teleporters,
    update: (elapsed) => dynamics.forEach((d) => d(elapsed)),
    dispose: () => {
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const m = o.material as THREE.Material | THREE.Material[];
          (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
        }
      });
    },
    terrain: { height: heightFn, slope: slopeFn },
    addCollider: (c) => colliders.push(c),
    noise,
    rng,
    minimap: { pixels: new Uint8ClampedArray(4), size: 2, worldRadius: 1 },
  };
  spec.decorate(built);

  /* ---- 小地图 ---- */
  const minimap = bakeMinimap(160, spec.boundsRadius, (x, z) => {
    const h = heightFn(x, z);
    if (spec.waterRadius > 0 && Math.hypot(x - spec.waterPos[0], z - spec.waterPos[1]) < spec.waterRadius * 0.95) {
      return { h, slope: 0, tint: [21, 80, 74] };
    }
    if (Math.hypot(x, z - spec.boundsRadius * 0.42) < 3) return { h, slope: 0, tint: [201, 162, 92] };
    return { h, slope: slopeFn(x, z), tint: spec.minimapGround };
  });
  built.minimap = minimap;

  return built;
}

function smooth(x: number, e0: number, e1: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 100000;
}
