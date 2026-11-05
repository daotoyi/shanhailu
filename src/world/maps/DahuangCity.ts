import * as THREE from 'three';
import { disposeObject } from '../dispose.js';
import { Noise2D } from '../../core/Noise.js';
import { Water } from '../../render/Water.js';
import { buildGateArch, buildShopStall, buildTeleporterPad, buildLanternPost, bakeMinimap } from '../structures.js';
import type { BuiltMap, BuiltTeleporter, MapCollider, MapDefinition, MapEnvironment } from './types.js';

/** 大荒城:暮色暖调主城枢纽(商店/公告/传送,M5 接商店功能) */
const ENV: MapEnvironment = {
  fogColor: '#a89a85',
  fogDensity: 0.0085,
  sunDir: [-0.75, 0.32, -0.35],
  sunColor: '#ffc48a',
  sunIntensity: 2.3,
  hemiSky: '#b8a890',
  hemiGround: '#3a2e22',
  hemiIntensity: 0.6,
  rimColor: '#c88a5c',
  skyZenith: '#3a4a58',
  skyMid: '#8a7a68',
  skyHorizon: '#d8c4a0',
  mountainColor: '#5c5648',
};

class DahuangCityMap implements BuiltMap {
  readonly group = new THREE.Group();
  readonly colliders: MapCollider[] = [];
  readonly teleporters: BuiltTeleporter[] = [];
  readonly minimap: { pixels: Uint8ClampedArray; size: number; worldRadius: number };
  private readonly noise = new Noise2D(777001);
  private readonly dynamics: { ring: THREE.Group; glow: THREE.Mesh; runeMat: THREE.MeshStandardMaterial }[] = [];

  constructor() {
    /* 平坦城内地形 */
    const geo = new THREE.PlaneGeometry(260, 260, 96, 96);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, this.heightAt(x, z));
    }
    geo.computeVertexNormals();
    const colors = new Float32Array(pos.count * 3);
    const cA = new THREE.Color('#8f8a72');
    const cB = new THREE.Color('#7d7a64');
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const g = this.noise.fbm(pos.getX(i) * 0.05, pos.getZ(i) * 0.05, 2);
      tmp.copy(cA).lerp(cB, Math.min(1, Math.max(0, g + 0.5)));
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const ground = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.97 }),
    );
    ground.receiveShadow = true;
    this.group.add(ground);

    /* 中央石板广场 */
    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(19, 19.6, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: '#9a917c', flatShading: true, roughness: 0.95 }),
    );
    plaza.position.y = 0.09;
    plaza.receiveShadow = true;
    this.group.add(plaza);

    /* 城门楼(北向记忆点) */
    const gate = buildGateArch(0, 42, Math.PI);
    this.group.add(gate.group);
    this.colliders.push(...gate.colliders);
    // 城墙两翼
    const wallMat = new THREE.MeshStandardMaterial({ color: '#7d7a6a', flatShading: true, roughness: 0.95 });
    for (const s of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(60, 4.6, 2.4), wallMat);
      wall.position.set(s * 32, 2.5, 42);
      wall.castShadow = wall.receiveShadow = true;
      this.group.add(wall);
      const cren = new THREE.Mesh(new THREE.BoxGeometry(60, 0.7, 0.5), wallMat);
      cren.position.set(s * 32, 5.1, 41.2);
      this.group.add(cren);
      this.colliders.push({ x: s * 32, z: 42, r: 24 });
    }

    /* 四铺面(幌子异色) */
    const shops: [number, number, number, string][] = [
      [-15, 8, 0.5, '#b03a2e'],
      [15, 8, -0.5, '#3f6f5f'],
      [-22, -6, 1.2, '#c9a25c'],
      [22, -6, -1.2, '#5c6f8a'],
    ];
    for (const [x, z, r, c] of shops) {
      const shop = buildShopStall(x, z, r, c);
      this.group.add(shop.group);
      this.colliders.push(...shop.colliders);
    }

    /* 灯柱阵 */
    for (const [x, z] of [[-8, -8], [8, -8], [-8, 14], [8, 14], [-14, -18], [14, -18]] as const) {
      this.group.add(buildLanternPost(x, z, '#ffb45e'));
      this.colliders.push({ x, z, r: 0.4 });
    }

    /* 传送阵 → 药王谷(广场中央偏南) */
    const pad = buildTeleporterPad();
    pad.group.position.set(0, 0.18, -24);
    this.group.add(pad.group);
    this.dynamics.push(pad);
    this.teleporters.push({
      id: 'to-valley',
      pos: new THREE.Vector2(0, -24),
      radius: 2.0,
      targetMapId: 'yaowang-valley',
      targetSpawnId: 'from-city',
      label: '药王谷',
      group: pad.group,
      update: (elapsed) => this.updatePad(pad, elapsed),
    });

    /* 环城水(护城河一角,暮色水面) */
    const moat = new Water({
      radius: 26,
      position: new THREE.Vector3(0, -0.6, 78),
      sunDir: new THREE.Vector3(...ENV.sunDir).normalize(),
      fogColor: new THREE.Color(ENV.fogColor),
    });
    this.group.add(moat.mesh);
    this.waters.push(moat);

    /* 南征门(M7:→九黎) */
    {
      const pad = buildTeleporterPad();
      pad.group.position.set(30, this.heightAt(30, -6) + 0.1, -6);
      this.group.add(pad.group);
      this.dynamics.push(pad);
      this.colliders.push(
        { x: 27.9, z: -8.1, r: 0.4 }, { x: 32.1, z: -8.1, r: 0.4 },
        { x: 27.9, z: -3.9, r: 0.4 }, { x: 32.1, z: -3.9, r: 0.4 },
      );
      this.teleporters.push({
        id: 'to-jiuli',
        pos: new THREE.Vector2(30, -6),
        radius: 2.0,
        targetMapId: 'jiuli-nanjiang',
        targetSpawnId: 'entry',
        label: '九黎南疆',
        group: pad.group,
        update: (elapsed) => this.updatePad(pad, elapsed),
      });
    }

    this.minimap = bakeMinimap(256, 110, (x, z) => {
      const h = this.heightAt(x, z);
      // 广场/建筑/城墙手绘 tint
      if (Math.hypot(x, z) < 19.6) return { h, slope: 0, tint: [154, 145, 124] };
      if (Math.abs(z - 42) < 3 && Math.abs(x) < 62) return { h, slope: 0, tint: [125, 122, 106] };
      if (Math.abs(x + 15) < 2.6 && Math.abs(z - 8) < 2) return { h, slope: 0, tint: [176, 58, 46] };
      if (Math.abs(x - 15) < 2.6 && Math.abs(z - 8) < 2) return { h, slope: 0, tint: [63, 111, 95] };
      if (Math.hypot(x, z + 24) < 3) return { h, slope: 0, tint: [201, 162, 92] };
      return { h, slope: 0 };
    });
  }

  private readonly waters: Water[] = [];

  private updatePad(pad: { ring: THREE.Group; glow: THREE.Mesh; runeMat: THREE.MeshStandardMaterial }, elapsed: number): void {
    pad.ring.rotation.y = elapsed * 0.6;
    pad.runeMat.emissiveIntensity = 1.6 + Math.sin(elapsed * 2.2) * 0.5;
    (pad.glow.material as THREE.MeshStandardMaterial).opacity = 0.18 + Math.sin(elapsed * 2.2) * 0.08;
  }

  heightAt(x: number, z: number): number {
    // 城内平缓 + 微起伏;护城河区下陷
    let h = this.noise.fbm(x * 0.02, z * 0.02, 3) * 0.7;
    const md = Math.hypot(x, z - 78);
    if (md < 30) h -= (1 - Math.min(1, md / 30)) * 2.2;
    return h;
  }

  update(elapsed: number): void {
    for (const w of this.waters) w.update(elapsed);
    for (const t of this.teleporters) t.update(elapsed);
  }

  dispose(): void {
    disposeObject(this.group);
  }
}

export const DAHUANG_CITY: MapDefinition = {
  id: 'dahuang-city',
  name: '大荒城',
  epigraph: '五族通衢,暮鼓晨钟',
  boundsRadius: 88,
  environment: ENV,
  spawns: [
    { id: 'center', pos: [0, 6], heading: Math.PI },
    { id: 'from-valley', pos: [0, -20], heading: Math.PI },
  ],
  build(): BuiltMap {
    return new DahuangCityMap();
  },
};
