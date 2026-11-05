import * as THREE from 'three';
import { disposeObject } from '../dispose.js';
import { Water } from '../../render/Water.js';
import { WATER_LEVEL, Terrain } from '../Terrain.js';
import { Vegetation } from '../Vegetation.js';
import { Shrine } from '../Shrine.js';
import { Fireflies } from '../Fireflies.js';
import { buildHerbHut, buildTeleporterPad, buildHerbGarden, buildLanternPost, bakeMinimap } from '../structures.js';
import { GrassTufts } from '../GrassTufts.js';
import type { BuiltMap, BuiltTeleporter, MapCollider, MapDefinition, MapEnvironment } from './types.js';

const ENV: MapEnvironment = {
  fogColor: '#9aa893',
  fogDensity: 0.0095,
  sunDir: [0.55, 0.62, -0.55],
  sunColor: '#ffe0b0',
  sunIntensity: 2.6,
  hemiSky: '#a8c4b2',
  hemiGround: '#4a3b2a',
  hemiIntensity: 0.65,
  rimColor: '#7fb8c8',
  skyZenith: '#274b52',
  skyMid: '#5d7f78',
  skyHorizon: '#c3bda4',
  mountainColor: '#3c5a54',
};

/** 药王谷(序章/第一章主图):山谷+池塘+神祠+药庐+药田+传送阵 */
class YaowangValleyMap implements BuiltMap {
  readonly group = new THREE.Group();
  readonly colliders: MapCollider[] = [];
  readonly teleporters: BuiltTeleporter[] = [];
  readonly terrain: Terrain;
  readonly minimap: { pixels: Uint8ClampedArray; size: number; worldRadius: number };
  private readonly waters: Water[] = [];
  private readonly shrine = new Shrine();
  private readonly fireflies: Fireflies;
  private readonly teleportDynamics: { ring: THREE.Group; glow: THREE.Mesh; runeMat: THREE.MeshStandardMaterial }[] = [];

  constructor() {
    this.terrain = new Terrain();
    this.group.add(this.terrain.mesh);

    const sunDir = new THREE.Vector3(...ENV.sunDir).normalize();
    const water = new Water({
      radius: 15.2,
      position: new THREE.Vector3(0, WATER_LEVEL, 8),
      sunDir,
      fogColor: new THREE.Color(ENV.fogColor),
    });
    this.waters.push(water);
    this.group.add(water.mesh);

    const veg = new Vegetation(this.terrain, [
      { x: 0, z: -30, radius: 9 },
      { x: 0, z: -16, radius: 5.5 },
      { x: -14, z: -18, radius: 6 },
      { x: 13, z: -11, radius: 7 },
      { x: 6, z: -25, radius: 4.5 },
    ]);
    this.group.add(veg.group);

    // 神祠(存档点,M3 接交互)
    this.group.add(this.shrine.group);
    for (const [px, pz] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]] as const) {
      this.colliders.push({ x: px, z: pz - 30, r: 0.5 });
    }
    this.colliders.push({ x: 0, z: -31.1, r: 1.2 });

    // 药庐
    const hut = buildHerbHut(-14, -18, 0.5);
    this.group.add(hut.group);
    this.colliders.push(...hut.colliders);

    // 药田(采集点 M5 接)
    const garden = buildHerbGarden(13, -11, -0.3);
    this.group.add(garden.group);

    // 池畔灯笼
    this.group.add(buildLanternPost(-9, 2), buildLanternPost(8, 18));
    this.colliders.push({ x: -9, z: 2, r: 0.4 }, { x: 8, z: 18, r: 0.4 });

    // 传送阵 → 大荒城
    const pad = buildTeleporterPad();
    pad.group.position.set(6, 0, -25);
    this.terrainSnap(pad.group);
    this.group.add(pad.group);
    this.colliders.push({ x: 3.9, z: -27.1, r: 0.4 }, { x: 8.1, z: -27.1, r: 0.4 }, { x: 3.9, z: -22.9, r: 0.4 }, { x: 8.1, z: -22.9, r: 0.4 });
    this.teleportDynamics.push(pad);
    this.teleporters.push({
      id: 'to-city',
      pos: new THREE.Vector2(6, -25),
      radius: 2.0,
      targetMapId: 'dahuang-city',
      targetSpawnId: 'from-valley',
      label: '大荒城',
      group: pad.group,
      update: (elapsed) => this.updatePad(pad, elapsed),
    });

    this.fireflies = new Fireflies([
      new THREE.Vector3(0, 0, 8),
      new THREE.Vector3(0, 0, -30),
      new THREE.Vector3(-14, 0, -16),
      new THREE.Vector3(12, 0, -2),
    ]);
    this.group.add(this.fireflies.points);

    this.minimap = bakeMinimap(256, 150, (x, z) => ({
      h: this.terrain.height(x, z),
      slope: this.terrain.slope(x, z),
      tint: Math.hypot(x - 6, z + 25) < 3 ? [201, 162, 92] : undefined,
    }));

    /* 草地簇(画质升级:单 draw call) */
    const grass = new GrassTufts(900, (x, z) => this.terrain.height(x, z), (x, z) => this.terrain.slope(x, z), 120, [
      { x: 0, z: -30, r: 7 }, { x: 0, z: -16, r: 4 }, { x: -14, z: -18, r: 5 },
    ]);
    this.group.add(grass.mesh);
  }

  /** 构件贴地形(整体取中心高度,构件自带台基可容小坡) */
  private terrainSnap(g: THREE.Group): void {
    g.position.y = this.terrain.height(g.position.x, g.position.z) - 0.12;
  }

  private updatePad(pad: { ring: THREE.Group; glow: THREE.Mesh; runeMat: THREE.MeshStandardMaterial }, elapsed: number): void {
    pad.ring.rotation.y = elapsed * 0.6;
    pad.runeMat.emissiveIntensity = 1.6 + Math.sin(elapsed * 2.2) * 0.5;
    (pad.glow.material as THREE.MeshStandardMaterial).opacity = 0.18 + Math.sin(elapsed * 2.2) * 0.08;
  }

  heightAt(x: number, z: number): number {
    return this.terrain.height(x, z);
  }

  update(elapsed: number): void {
    for (const w of this.waters) w.update(elapsed);
    this.shrine.update(elapsed);
    this.fireflies.update(elapsed);
    for (const t of this.teleporters) t.update(elapsed);
  }

  dispose(): void {
    disposeObject(this.group);
  }
}

export const YAOWANG_VALLEY: MapDefinition = {
  id: 'yaowang-valley',
  name: '药王谷',
  epigraph: '药香盈谷,神农遗泽',
  boundsRadius: 128,
  environment: ENV,
  spawns: [
    { id: 'start', pos: [0, -16], heading: Math.PI },
    { id: 'from-city', pos: [6, -21], heading: Math.PI },
  ],
  build(): BuiltMap {
    return new YaowangValleyMap();
  },
};
