import * as THREE from 'three';
import type { CharacterPalette } from '../data/character-palettes.js';
import {
  buildMats, mesh, makeCollar, makeWaist, makeSkirt, makeSleeve,
  makeInnerSleeve, makeShoe, makeShoulder,
} from './rigParts.js';
import type { RigMats } from './rigParts.js';
import { makeHead } from './rigHead.js';

/**
 * 角色人形 Rig v4.1(国漫仙侠公子):墨黑中分长发 + 金质翼冠嵌蓝宝石、
 * 垂胸长鬓发、剑眉凤眼、藏青外袍 + 月白宽 V 交领、银灰云纹肩饰、
 * 广袖垂胡、腰封青玉佩、圆头布鞋;分段四肢 + 程序动画状态机。
 * v4.1 比例微调:肩略加宽、腿略加粗,减弱低模 Q 版头重感。
 * 主角与 NPC 共用;武器挂点保留(右手前臂末端)。
 * 部件几何见 rigParts.ts / rigHead.ts,本文件只负责组装与动画。
 */

export type RigAnimState = 'idle' | 'run' | 'attack' | 'cast' | 'dodge' | 'dead';

export interface CharacterRig {
  root: THREE.Group;
  readonly rightHand: THREE.Group;
  setPalette(p: CharacterPalette): void;
  animate(state: RigAnimState, elapsed: number, dt: number, speedNorm: number): void;
  dispose(): void;
}

export function createCharacterRig(palette: CharacterPalette): CharacterRig {
  const M: RigMats = buildMats(palette);
  const root = new THREE.Group();
  root.name = `rig-${palette.id}`;

  /* ============ 躯干(髋部原点) ============ */
  const body = new THREE.Group();
  body.position.y = 0.98;
  root.add(body);

  const chest = mesh(new THREE.CylinderGeometry(0.185, 0.155, 0.44, 12), M.robe, 0, 0.24, 0);
  body.add(chest);
  for (const s of [-1, 1] as const) {
    const shoulder = mesh(new THREE.SphereGeometry(0.085, 10, 8), M.robe, s * 0.225, 0.4, 0);
    shoulder.scale.set(1.15, 0.7, 1);
    body.add(shoulder);
    const pauldron = makeShoulder(M, s);
    pauldron.position.set(s * 0.225, 0.4, 0);
    body.add(pauldron);
  }
  body.add(makeCollar(M));

  const waist = makeWaist(M);
  body.add(waist.group);
  const skirt = makeSkirt(M);
  body.add(skirt);

  /* ============ 头颈 ============ */
  const neck = mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.055, 8), M.skin, 0, 0.515, 0);
  body.add(neck);
  const { head, backHair, sideLocks } = makeHead(M);
  body.add(head);

  /* ============ 手臂(肩→肘→腕) ============ */
  function makeArm(side: -1 | 1): { shoulder: THREE.Group; elbow: THREE.Group } {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.255, 0.4, 0);
    body.add(shoulder);
    shoulder.add(makeSleeve(M));
    const upper = mesh(new THREE.CylinderGeometry(0.052, 0.045, 0.26, 10), M.skin, 0, -0.17, 0);
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    shoulder.add(elbow);
    // 中衣窄袖包住前臂(汉服内外层次),只留手在广袖外
    elbow.add(makeInnerSleeve(M));
    const hand = mesh(new THREE.SphereGeometry(0.048, 10, 8), M.skin, 0, -0.285, 0);
    hand.scale.set(0.85, 1.1, 0.6);
    elbow.add(hand);
    return { shoulder, elbow };
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);

  /* ============ 右手武器挂点 ============ */
  const rightHand = new THREE.Group();
  rightHand.position.set(0, -0.3, 0.02);
  armR.elbow.add(rightHand);

  /* ============ 腿(髋→膝→踝) ============ */
  function makeLeg(side: -1 | 1): { hip: THREE.Group; knee: THREE.Group } {
    const hip = new THREE.Group();
    hip.position.set(side * 0.095, -0.06, 0);
    body.add(hip);
    const thigh = mesh(new THREE.CylinderGeometry(0.086, 0.07, 0.4, 10), M.pants, 0, -0.2, 0);
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.4;
    hip.add(knee);
    const calf = mesh(new THREE.CylinderGeometry(0.062, 0.05, 0.38, 10), M.pants, 0, -0.19, 0);
    knee.add(calf);
    knee.add(makeShoe(M));
    return { hip, knee };
  }
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  /* ============ 动画状态 ============ */
  let animState: RigAnimState = 'idle';
  let attackT = 0;
  let deadT = 0;

  const animate: CharacterRig['animate'] = (state, elapsed, dt, speedNorm) => {
    if (state !== animState) {
      animState = state;
      if (state === 'attack') attackT = 0;
      if (state === 'dead') deadT = 0;
    }
    attackT += dt;
    if (state === 'dead') deadT += dt;

    const runBlend = state === 'run' ? Math.min(1, speedNorm) : 0;
    const phase = elapsed * 10.5;
    const swing = Math.sin(phase);

    // 躯干:呼吸 + 跑步起伏 + 前倾
    const breathe = Math.sin(elapsed * 2.1) * 0.012;
    const bob = Math.abs(Math.sin(phase)) * 0.05 * runBlend;
    body.position.y = 0.98 + breathe + bob;
    const leanTarget = state === 'run' ? 0.14 * runBlend : 0;
    body.rotation.x += (leanTarget - body.rotation.x) * Math.min(1, dt * 9);

    if (state === 'dead') {
      const fall = Math.min(1, deadT * 2.1);
      body.rotation.x += (fall * 1.42 - body.rotation.x) * Math.min(1, dt * 8);
      body.position.y = 0.98 - fall * 0.5;
      head.rotation.x = fall * 0.4;
      return;
    }

    // 腿:大腿摆动 + 膝盖弯曲(后摆收腿,前伸蹬直)
    const thighSwing = swing * 0.72 * runBlend;
    legL.hip.rotation.x += (thighSwing - legL.hip.rotation.x) * Math.min(1, dt * 15);
    legR.hip.rotation.x += (-thighSwing - legR.hip.rotation.x) * Math.min(1, dt * 15);
    const kneeL = Math.max(0, -Math.sin(phase)) * 1.05 * runBlend + 0.08;
    const kneeR = Math.max(0, Math.sin(phase)) * 1.05 * runBlend + 0.08;
    legL.knee.rotation.x += (kneeL - legL.knee.rotation.x) * Math.min(1, dt * 15);
    legR.knee.rotation.x += (kneeR - legR.knee.rotation.x) * Math.min(1, dt * 15);

    // 手臂:与腿反相摆 + 肘常弯;攻击/施法覆盖右臂(左臂)
    const armSwing = -swing * 0.62 * runBlend;
    let shLX = armSwing + Math.sin(elapsed * 2.1) * 0.03;
    let shRX = -armSwing + Math.sin(elapsed * 2.1 + 1) * 0.03;
    let elLX = 0.35 + runBlend * 0.35;
    let elRX = 0.35 + runBlend * 0.35;
    let bodyYaw = 0;
    if (state === 'attack') {
      const t = Math.min(1, attackT / 0.34);
      if (t < 0.38) {
        const k = t / 0.38;
        shRX = -2.1 * k;
        elRX = 1.15 - 0.5 * k;
        bodyYaw = 0.22 * k;
      } else if (t < 0.72) {
        const k = (t - 0.38) / 0.34;
        shRX = -2.1 + 2.75 * k;
        elRX = 0.65 - 0.5 * k;
        bodyYaw = 0.22 - 0.5 * k;
      } else {
        const k = (t - 0.72) / 0.28;
        shRX = 0.65 - 0.65 * k;
        elRX = 0.15 + 0.3 * k;
        bodyYaw = -0.28 + 0.28 * k;
      }
    } else if (state === 'cast') {
      const t = Math.min(1, attackT / 0.5);
      const s = Math.sin(t * Math.PI);
      shRX = -1.55 * s;
      shLX = -1.1 * s;
      elRX = 0.9 - 0.45 * s;
      elLX = 0.9 - 0.45 * s;
    }
    armL.shoulder.rotation.x += (shLX - armL.shoulder.rotation.x) * Math.min(1, dt * 16);
    armR.shoulder.rotation.x += (shRX - armR.shoulder.rotation.x) * Math.min(1, dt * 16);
    armL.elbow.rotation.x += (elLX - armL.elbow.rotation.x) * Math.min(1, dt * 16);
    armR.elbow.rotation.x += (elRX - armR.elbow.rotation.x) * Math.min(1, dt * 16);
    armL.shoulder.rotation.z = 0.07 + runBlend * 0.06;
    armR.shoulder.rotation.z = -0.07 - runBlend * 0.06;
    body.rotation.y += (bodyYaw - body.rotation.y) * Math.min(1, dt * 14);

    // 袍摆与头部稳定
    skirt.rotation.z = Math.sin(phase) * 0.045 * runBlend;
    skirt.rotation.x = runBlend * 0.06;
    head.rotation.x = -bob * 1.5 + (state === 'idle' ? Math.sin(elapsed * 0.75) * 0.022 : 0);
    head.rotation.y = state === 'idle' ? Math.sin(elapsed * 0.45) * 0.14 : 0;
    // 后披发、垂胸长鬓发与宫绦:重力下垂 + 跑动后扬 + 风摆
    backHair.rotation.x = 0.06 + runBlend * 0.32 + Math.sin(elapsed * 2.4) * 0.05;
    backHair.rotation.z = Math.sin(elapsed * 1.7) * 0.06;
    sideLocks.forEach((g, i) => {
      g.rotation.x = runBlend * 0.26 + Math.sin(elapsed * 1.9 + i * 1.7) * 0.05;
      g.rotation.z = Math.sin(elapsed * 1.5 + i * 2.2) * 0.045;
    });
    waist.tassels.forEach((g, i) => {
      g.rotation.x = -runBlend * 0.42 + Math.sin(elapsed * 2.1 + i * 1.5) * 0.1;
      g.rotation.z = Math.sin(elapsed * 1.6 + i * 2.1) * 0.09;
    });
  };

  return {
    root,
    rightHand,
    setPalette(p: CharacterPalette) {
      const next = buildMats(p);
      for (const key of Object.keys(M) as (keyof RigMats)[]) {
        M[key]!.color.copy(next[key]!.color);
        M[key]!.emissive.copy(next[key]!.emissive);
        next[key]!.dispose();
      }
    },
    animate,
    dispose() {
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const m = o.material as THREE.Material | THREE.Material[];
          (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
        }
      });
    },
  };
}
