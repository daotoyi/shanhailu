import * as THREE from 'three';
import { createCharacterRig, type CharacterRig } from './CharacterRig.js';
import type { CharacterPalette } from '../data/character-palettes.js';
import { PALETTES } from '../data/character-palettes.js';

/**
 * 静态 NPC(M3):Rig 摆位 + idle 动画;对话与任务由 ScenarioDirector 绑定。
 * M4 怪物 AI 将扩展同一基类思想(状态机),此处保持轻量。
 */
export class NPC {
  readonly rig: CharacterRig;
  readonly position = new THREE.Vector3();

  constructor(
    readonly id: string,
    readonly name: string,
    paletteId: string,
    pos: [number, number],
    heading: number,
    heightAt: (x: number, z: number) => number,
  ) {
    const palette: CharacterPalette = PALETTES[paletteId] ?? PALETTES['apprentice']!;
    this.rig = createCharacterRig(palette);
    this.position.set(pos[0], heightAt(pos[0], pos[1]), pos[1]);
    this.rig.root.position.copy(this.position);
    this.rig.root.rotation.y = heading;
  }

  addTo(scene: THREE.Scene): void {
    scene.add(this.rig.root);
  }

  removeFrom(scene: THREE.Scene): void {
    scene.remove(this.rig.root);
  }

  update(elapsed: number): void {
    this.rig.animate('idle', elapsed, 1 / 60, 0);
  }
}
