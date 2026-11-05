/** NPC 与潜行缇骑的程序化装配(从 ScenarioDirector 抽出,保持单文件 ≤400 行) */
import * as THREE from 'three';
import { NPC, type NPC as NPCT } from '../actor/NPC.js';
import type { Patroller } from '../world/Triggers.js';

export function createNpc(
  scene: THREE.Scene,
  id: string,
  name: string,
  paletteId: string,
  pos: [number, number],
  heading: number,
  heightAt: (x: number, z: number) => number,
): NPCT {
  const npc = new NPC(id, name, paletteId, pos, heading, heightAt);
  npc.addTo(scene);
  return npc;
}

/** 第一章潜行区的火把缇骑 */
export function createKiller(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 1.5, 6),
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 }),
  );
  body.position.y = 0.75;
  body.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 6),
    new THREE.MeshStandardMaterial({ color: '#1a140e', flatShading: true }),
  );
  head.position.y = 1.62;
  const torch = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 6, 6),
    new THREE.MeshStandardMaterial({ color: '#ff9a3c', emissive: '#ff6a1a', emissiveIntensity: 2.2 }),
  );
  torch.position.set(0.4, 1.5, 0.3);
  g.add(body, head, torch);
  return g;
}

/** 第一章潜行区:两名火把缇骑的巡逻路径(贴地高度由地图 heightAt 决定) */
export function createCh1Patrols(heightAt: (x: number, z: number) => number): Patroller[] {
  const mk = (
    color: string,
    coords: [number, number][],
    speed: number,
    visionDist: number,
    visionAngle: number,
  ): Patroller => ({
    group: createKiller(color),
    path: coords.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    speed,
    visionDist,
    visionAngle,
    legPhase: 0,
  });
  const list = [
    mk('#5a2c22', [[-4, -20], [-4, -34], [-9, -34], [-9, -20]], 0.055, 7.5, 0.62),
    mk('#33291f', [[5, -36], [5, -22], [10, -22], [10, -36]], 0.045, 7.0, 0.6),
  ];
  for (const p of list) {
    for (const v of p.path) v.y = heightAt(v.x, v.z) + 0.02;
    p.group.position.copy(p.path[0]!);
  }
  return list;
}
