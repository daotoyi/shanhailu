import * as THREE from 'three';
import type { CharacterPalette } from '../data/character-palettes.js';

/**
 * 角色人形 Rig v2(M8+ 画质升级):分段四肢(肘/膝弯曲)、五官头面、
 * 汉服层叠衣袍、平滑着色;程序动画(idle 呼吸/跑步行走/攻击/施法/倒地)。
 * 主角与 NPC 共用;武器挂点保留(右手前臂末端)。
 */

export type RigAnimState = 'idle' | 'run' | 'attack' | 'cast' | 'dodge' | 'dead';

export interface CharacterRig {
  root: THREE.Group;
  readonly rightHand: THREE.Group;
  setPalette(p: CharacterPalette): void;
  animate(state: RigAnimState, elapsed: number, dt: number, speedNorm: number): void;
  dispose(): void;
}

interface Mats {
  robe: THREE.MeshStandardMaterial;
  robeDark: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  belt: THREE.MeshStandardMaterial;
  pants: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  hat: THREE.MeshStandardMaterial;
  shoe: THREE.MeshStandardMaterial;
  eyeWhite: THREE.MeshStandardMaterial;
  eyeDark: THREE.MeshStandardMaterial;
  mouth: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
}

function buildMats(p: CharacterPalette): Mats {
  const smooth = (color: string, rough = 0.85): THREE.MeshStandardMaterial =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
  return {
    robe: smooth(p.robe, 0.88),
    robeDark: smooth(new THREE.Color(p.robe).multiplyScalar(0.72).getStyle(), 0.9),
    trim: smooth(p.trim, 0.8),
    belt: smooth(p.belt, 0.7),
    pants: smooth(p.pants, 0.9),
    skin: smooth(p.skin, 0.62),
    hair: smooth(p.hair, 0.55),
    hat: smooth(p.hat, 0.85),
    shoe: smooth(p.shoe, 0.8),
    eyeWhite: smooth('#f2f0ea', 0.35),
    eyeDark: smooth('#2b1c12', 0.3),
    mouth: smooth('#8a4a42', 0.5),
    gold: smooth('#c9a25c', 0.35),
  };
}

function mesh(geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

export function createCharacterRig(palette: CharacterPalette): CharacterRig {
  const M = buildMats(palette);
  const root = new THREE.Group();
  root.name = `rig-${palette.id}`;

  /* ============ 躯干(髋部原点) ============ */
  const body = new THREE.Group();
  body.position.y = 0.98;
  root.add(body);

  // 上衣:胸背(平滑锥柱,肩宽腰窄)
  const chest = mesh(new THREE.CylinderGeometry(0.185, 0.155, 0.44, 12), M.robe, 0, 0.24, 0);
  body.add(chest);
  // 交领(汉服 V 领:两条斜襟)
  const lapelL = mesh(new THREE.BoxGeometry(0.045, 0.34, 0.02), M.trim, -0.055, 0.3, 0.155);
  lapelL.rotation.z = -0.42;
  const lapelR = mesh(new THREE.BoxGeometry(0.045, 0.34, 0.02), M.trim, 0.055, 0.3, 0.155);
  lapelR.rotation.z = 0.42;
  body.add(lapelL, lapelR);
  // 束腰(腰带+玉佩+绦带坠)
  const belt = mesh(new THREE.CylinderGeometry(0.168, 0.172, 0.09, 12), M.belt, 0, 0.045, 0);
  body.add(belt);
  const jade = mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.008, 10),
    new THREE.MeshStandardMaterial({ color: '#3f6f5f', roughness: 0.25 }), 0, -0.03, 0.16);
  jade.rotation.x = Math.PI / 2;
  const jadeKnot = mesh(new THREE.SphereGeometry(0.014, 6, 5), M.gold, 0, 0.0, 0.165);
  body.add(jade, jadeKnot);
  // 腰间长飘带(前垂两根,随跑动/风摆动 —— 国漫气质)
  const sashGroup = new THREE.Group();
  sashGroup.position.set(0, 0.03, 0);
  body.add(sashGroup);
  const sashes: THREE.Group[] = [];
  for (const [sx, sz] of [[-0.16, 0.24], [0.16, 0.24], [0.03, -0.26]] as const) {
    const g = new THREE.Group();
    g.position.set(sx, 0, sz);
    const ribbon = mesh(new THREE.BoxGeometry(0.045, 0.46, 0.012), M.trim, 0, -0.23, 0);
    g.add(ribbon);
    const tip = mesh(new THREE.BoxGeometry(0.049, 0.09, 0.013), M.belt, 0, -0.48, 0);
    g.add(tip);
    sashGroup.add(g);
    sashes.push(g);
  }
  // 下裙(袍摆,随跑动摆动)
  const skirt = mesh(new THREE.CylinderGeometry(0.16, 0.27, 0.52, 12), M.robeDark, 0, -0.24, 0);
  body.add(skirt);
  const hem = mesh(new THREE.CylinderGeometry(0.272, 0.28, 0.06, 12), M.trim, 0, -0.48, 0);
  body.add(hem);
  // 肩头披领(小垫肩)
  for (const s of [-1, 1] as const) {
    const shoulder = mesh(new THREE.SphereGeometry(0.085, 10, 8), M.robe, s * 0.21, 0.4, 0);
    shoulder.scale.set(1.15, 0.7, 1);
    body.add(shoulder);
  }

  /* ============ 头颈 ============ */
  const neck = mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 8), M.skin, 0, 0.49, 0);
  body.add(neck);
  const head = new THREE.Group();
  head.position.y = 0.62;
  body.add(head);
  // 颅与下颌
  const skull = mesh(new THREE.SphereGeometry(0.15, 18, 16), M.skin);
  skull.scale.set(0.94, 1.06, 0.98);
  skull.position.y = 0.05;
  const jaw = mesh(new THREE.SphereGeometry(0.105, 14, 12), M.skin, 0, -0.035, 0.028);
  jaw.scale.set(0.88, 0.78, 0.95);
  head.add(skull, jaw);
  // 发冠层(后脑+顶:偏后,露出面部)
  const hairBack = mesh(new THREE.SphereGeometry(0.156, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), M.hair, 0, 0.062, -0.028);
  hairBack.scale.set(0.98, 1.02, 1.0);
  head.add(hairBack);
  // 刘海(三缕,薄贴额际)
  for (const [bx, bz, br] of [[-0.058, 0.12, 0.028], [0, 0.132, 0.033], [0.058, 0.12, 0.028]] as const) {
    const bang = mesh(new THREE.SphereGeometry(br, 8, 6), M.hair, bx, 0.128, bz);
    bang.scale.set(1.05, 0.55, 0.42);
    head.add(bang);
  }
  // 国漫风:高马尾(发束扎起,垂落飘动)+ 鬓边垂发
  const hairTie = mesh(new THREE.TorusGeometry(0.038, 0.014, 8, 12), M.gold, 0, 0.21, -0.075);
  hairTie.rotation.x = Math.PI / 2 - 0.3;
  const ponytail = new THREE.Group();
  ponytail.position.set(0, 0.19, -0.09);
  const tailSegs: THREE.Mesh[] = [];
  const tailLens = [0.13, 0.115, 0.1, 0.085];
  let py = 0;
  for (let i = 0; i < tailLens.length; i++) {
    const r = 0.062 - i * 0.011;
    const seg = mesh(new THREE.SphereGeometry(r, 10, 8), M.hair, 0, py - tailLens[i]! / 2, -0.02 - i * 0.012);
    seg.scale.set(1 - i * 0.1, tailLens[i]! / r, 1 - i * 0.1);
    ponytail.add(seg);
    tailSegs.push(seg);
    py -= tailLens[i]!;
  }
  const tailTip = mesh(new THREE.ConeGeometry(0.03, 0.11, 8), M.hair, 0, py - 0.06, -0.055);
  tailTip.rotation.x = Math.PI;
  ponytail.add(tailTip);
  head.add(hairTie, ponytail);
  // 鬓边垂发(两缕贴颊)
  for (const s of [-1, 1] as const) {
    const lock = mesh(new THREE.CylinderGeometry(0.02, 0.012, 0.3, 7), M.hair, s * 0.135, -0.02, 0.06);
    lock.rotation.z = s * 0.05;
    head.add(lock);
  }
  // 眉(两道,纤细)
  for (const s of [-1, 1] as const) {
    const brow = mesh(new THREE.BoxGeometry(0.04, 0.007, 0.01), M.hair, s * 0.052, 0.08, 0.134);
    brow.rotation.z = s * 0.16;
    head.add(brow);
  }
  // 眼(国漫大眼:白+瞳+上睫毛线)
  for (const s of [-1, 1] as const) {
    const white = mesh(new THREE.SphereGeometry(0.036, 10, 8), M.eyeWhite, s * 0.052, 0.044, 0.124);
    white.scale.set(1.12, 0.92, 0.6);
    const iris = mesh(new THREE.SphereGeometry(0.02, 8, 7), M.eyeDark, s * 0.052, 0.041, 0.147);
    iris.scale.set(1, 1.08, 0.5);
    const lash = mesh(new THREE.BoxGeometry(0.062, 0.009, 0.01), M.hair, s * 0.052, 0.062, 0.13);
    lash.rotation.z = s * 0.1;
    head.add(white, iris, lash);
  }
  // 鼻与口
  const nose = mesh(new THREE.ConeGeometry(0.016, 0.042, 6), M.skin, 0, 0.008, 0.152);
  nose.rotation.x = Math.PI / 2 + 0.25;
  const mouth = mesh(new THREE.BoxGeometry(0.042, 0.008, 0.008), M.mouth, 0, -0.052, 0.132);
  head.add(nose, mouth);
  // 双耳
  for (const s of [-1, 1] as const) {
    const ear = mesh(new THREE.SphereGeometry(0.028, 8, 7), M.skin, s * 0.145, 0.04, 0.01);
    ear.scale.set(0.5, 1, 0.8);
    head.add(ear);
  }

  /* ============ 手臂(肩→肘→腕) ============ */
  function makeArm(side: -1 | 1): { shoulder: THREE.Group; elbow: THREE.Group } {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.245, 0.4, 0);
    body.add(shoulder);
    // 宽袖(垂坠,独立双面材质避免污染共享 robe)
    const sleeveMat = M.robe.clone();
    sleeveMat.side = THREE.DoubleSide;
    const sleeve = mesh(new THREE.CylinderGeometry(0.075, 0.105, 0.2, 10, 1, true), sleeveMat, 0, -0.1, 0);
    shoulder.add(sleeve);
    const upper = mesh(new THREE.CylinderGeometry(0.052, 0.045, 0.26, 10), M.skin, 0, -0.17, 0);
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    shoulder.add(elbow);
    const cuffMat = M.trim.clone();
    cuffMat.side = THREE.DoubleSide;
    const cuff = mesh(new THREE.CylinderGeometry(0.058, 0.066, 0.08, 10, 1, true), cuffMat, 0, -0.03, 0);
    elbow.add(cuff);
    const fore = mesh(new THREE.CylinderGeometry(0.043, 0.038, 0.24, 10), M.skin, 0, -0.14, 0);
    elbow.add(fore);
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
    const thigh = mesh(new THREE.CylinderGeometry(0.078, 0.062, 0.4, 10), M.pants, 0, -0.2, 0);
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.4;
    hip.add(knee);
    const calf = mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.38, 10), M.pants, 0, -0.19, 0);
    knee.add(calf);
    const ankle = mesh(new THREE.CylinderGeometry(0.05, 0.052, 0.07, 8), M.shoe, 0, -0.38, 0);
    knee.add(ankle);
    const foot = mesh(new THREE.BoxGeometry(0.095, 0.06, 0.21), M.shoe, 0, -0.435, 0.05);
    knee.add(foot);
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
    // 马尾与飘带:重力下垂 + 跑动后扬 + 风摆
    const tailSway = Math.sin(elapsed * 2.4) * 0.09;
    ponytail.rotation.x = 0.12 + runBlend * 0.45 + tailSway * 0.5;
    ponytail.rotation.z = Math.sin(elapsed * 1.7) * 0.08;
    sashes.forEach((g, i) => {
      g.rotation.x = -runBlend * 0.5 + Math.sin(elapsed * 2.1 + i * 1.3) * 0.12;
      g.rotation.z = Math.sin(elapsed * 1.6 + i * 2.1) * 0.1;
    });
  };

  return {
    root,
    rightHand,
    setPalette(p: CharacterPalette) {
      const next = buildMats(p);
      for (const key of Object.keys(M) as (keyof Mats)[]) {
        M[key]!.color.copy(next[key]!.color);
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
