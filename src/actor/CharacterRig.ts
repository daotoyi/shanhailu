import * as THREE from 'three';
import type { CharacterPalette } from '../data/character-palettes.js';

/**
 * 程序化风格化人形 Rig(主角/NPC/部分人形怪共用,PROMPT §4.3)。
 * 几何拼装 + 材质分区;动画为状态机接口下的程序动画,M4 后可无缝换 glTF 骨骼动画。
 *
 * 层级:root(贴地) → body(髋) → torso/head/armL/armR/legL/legR
 */

export type RigAnimState = 'idle' | 'run' | 'attack' | 'cast' | 'dodge' | 'dead';

interface RigMaterials {
  robe: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  belt: THREE.MeshStandardMaterial;
  pants: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  hat: THREE.MeshStandardMaterial;
  shoe: THREE.MeshStandardMaterial;
}

export interface CharacterRig {
  root: THREE.Group;
  /** 右手武器挂点(武器/法器绑定处) */
  readonly rightHand: THREE.Group;
  setPalette(p: CharacterPalette): void;
  /** 每帧驱动;speedNorm 0~1 用于 idle↔run 混合 */
  animate(state: RigAnimState, elapsed: number, dt: number, speedNorm: number): void;
  /** 朝向由外部直接设 root.rotation.y */
  dispose(): void;
}

function mat(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.92, metalness: 0 });
}

function buildMaterials(p: CharacterPalette): RigMaterials {
  return {
    robe: mat(p.robe), trim: mat(p.trim), belt: mat(p.belt), pants: mat(p.pants),
    skin: mat(p.skin), hair: mat(p.hair), hat: mat(p.hat), shoe: mat(p.shoe),
  };
}

/** 组装一个部位网格 */
function part(
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function createCharacterRig(palette: CharacterPalette): CharacterRig {
  const mats = buildMaterials(palette);
  const root = new THREE.Group();
  root.name = `rig-${palette.id}`;

  /* ---- 躯干组(髋部原点) ---- */
  const body = new THREE.Group();
  body.position.y = 0.92;
  root.add(body);

  // 袍身:上窄下宽圆柱,药徒长袍
  const robe = part(new THREE.CylinderGeometry(0.16, 0.27, 0.62, 8), mats.robe, 0, 0.02, 0);
  body.add(robe);
  // 衣缘(下摆一圈)
  const hem = part(new THREE.CylinderGeometry(0.275, 0.29, 0.1, 8), mats.trim, 0, -0.26, 0);
  body.add(hem);
  // 胸口襟缘条
  const lapel = part(new THREE.BoxGeometry(0.05, 0.34, 0.02), mats.trim, 0.07, 0.28, 0.15);
  lapel.rotation.z = 0.16;
  body.add(lapel);
  // 腰带
  const beltMesh = part(new THREE.CylinderGeometry(0.185, 0.185, 0.09, 8), mats.belt, 0, 0.16, 0);
  body.add(beltMesh);
  // 腰带坠(玉佩)
  const jade = part(new THREE.BoxGeometry(0.05, 0.09, 0.02),
    new THREE.MeshStandardMaterial({ color: '#3f6f5f', flatShading: true, roughness: 0.5 }), 0, 0.07, 0.17);
  body.add(jade);
  // 背后药篓(竹色小筐)
  const basket = part(new THREE.CylinderGeometry(0.11, 0.085, 0.24, 6),
    new THREE.MeshStandardMaterial({ color: '#a8925c', flatShading: true, roughness: 1 }), 0, 0.28, -0.21);
  basket.rotation.x = 0.22;
  body.add(basket);

  /* ---- 头部 ---- */
  const head = new THREE.Group();
  head.position.y = 0.52;
  body.add(head);
  head.add(part(new THREE.SphereGeometry(0.16, 10, 8), mats.skin, 0, 0.08, 0));
  // 发盖(上半球)
  const hair = part(new THREE.SphereGeometry(0.165, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), mats.hair, 0, 0.09, 0);
  head.add(hair);
  // 发髻
  head.add(part(new THREE.SphereGeometry(0.055, 6, 6), mats.hair, 0, 0.24, -0.06));
  // 眼(两点,面 +z 前方)
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#1a140e', roughness: 0.6 });
  head.add(part(new THREE.SphereGeometry(0.018, 5, 5), eyeMat, -0.06, 0.08, 0.145));
  head.add(part(new THREE.SphereGeometry(0.018, 5, 5), eyeMat, 0.06, 0.08, 0.145));
  // 斗笠(薄锥 + 顶珠)
  const hat = part(new THREE.ConeGeometry(0.27, 0.14, 10), mats.hat, 0, 0.24, 0);
  head.add(hat);
  head.add(part(new THREE.SphereGeometry(0.028, 6, 6), mats.belt, 0, 0.315, 0));

  /* ---- 手臂(肩部枢轴) ---- */
  function makeArm(side: -1 | 1): THREE.Group {
    const arm = new THREE.Group();
    arm.position.set(side * 0.21, 0.42, 0);
    const sleeve = part(new THREE.CylinderGeometry(0.055, 0.05, 0.3, 6), mats.robe, 0, -0.14, 0);
    arm.add(sleeve);
    const cuff = part(new THREE.CylinderGeometry(0.056, 0.058, 0.06, 6), mats.trim, 0, -0.31, 0);
    arm.add(cuff);
    const hand = part(new THREE.SphereGeometry(0.045, 6, 6), mats.skin, 0, -0.36, 0);
    arm.add(hand);
    body.add(arm);
    return arm;
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);

  /* ---- 右手武器挂点 ---- */
  const rightHand = new THREE.Group();
  rightHand.position.set(0, -0.36, 0);
  armR.add(rightHand);

  /* ---- 腿(袍下露出小腿) ---- */
  function makeLeg(side: -1 | 1): THREE.Group {
    const leg = new THREE.Group();
    leg.position.set(side * 0.09, -0.24, 0);
    const shin = part(new THREE.CylinderGeometry(0.05, 0.045, 0.3, 6), mats.pants, 0, -0.15, 0);
    leg.add(shin);
    const shoe = part(new THREE.BoxGeometry(0.09, 0.06, 0.15), mats.shoe, 0, -0.31, 0.02);
    leg.add(shoe);
    body.add(leg);
    return leg;
  }
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  /* ---- 动画状态 ---- */
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
    const freq = 9.5;
    const phase = elapsed * freq;

    // 基础呼吸/奔跑 bob
    const breathe = Math.sin(elapsed * 2.2) * 0.012;
    const runBob = Math.abs(Math.sin(phase)) * 0.055 * runBlend;
    body.position.y = 0.92 + breathe + runBob;

    // 躯干前倾(跑) / 低头(死亡)
    const targetLean = state === 'run' ? 0.16 * runBlend : state === 'dead' ? 0 : 0;
    body.rotation.x += (targetLean - body.rotation.x) * Math.min(1, dt * 10);

    if (state === 'dead') {
      // 倒地:整体前倒
      const fall = Math.min(1, deadT * 2.2);
      body.rotation.x += (fall * 1.35 - body.rotation.x) * Math.min(1, dt * 8);
      body.position.y = 0.92 - fall * 0.45;
      return;
    }

    // 手臂:跑动反相摆 / 攻击时右臂劈砍
    const swing = Math.sin(phase) * 0.85 * runBlend;
    let armLX = swing + Math.sin(elapsed * 2.2) * 0.03;
    let armRX = -swing + Math.sin(elapsed * 2.2 + 1) * 0.03;
    if (state === 'attack') {
      const t = Math.min(1, attackT / 0.34);
      // 抬起(0~0.4)→ 劈下(0.4~0.75)→ 收(0.75~1)
      const curve = t < 0.4 ? -1.9 * (t / 0.4) : t < 0.75 ? -1.9 + 2.6 * ((t - 0.4) / 0.35) : 0.7 - 0.7 * ((t - 0.75) / 0.25);
      armRX = curve;
    } else if (state === 'cast') {
      const t = Math.min(1, attackT / 0.5);
      armRX = -1.4 * Math.sin(t * Math.PI);
      armLX = -0.5 * Math.sin(t * Math.PI);
    }
    armL.rotation.x += (armLX - armL.rotation.x) * Math.min(1, dt * 14);
    armR.rotation.x += (armRX - armR.rotation.x) * Math.min(1, dt * 14);
    armL.rotation.z = 0.06 + runBlend * 0.05;
    armR.rotation.z = -0.06 - runBlend * 0.05;

    // 腿:跑动摆动
    const legSwing = Math.sin(phase) * 0.75 * runBlend;
    legL.rotation.x += (legSwing - legL.rotation.x) * Math.min(1, dt * 14);
    legR.rotation.x += (-legSwing - legR.rotation.x) * Math.min(1, dt * 14);

    // 头部:跑步时轻微稳定(反向 bob)
    head.rotation.x = -runBob * 1.6 + (state === 'idle' ? Math.sin(elapsed * 0.7) * 0.02 : 0);
    head.rotation.y = state === 'idle' ? Math.sin(elapsed * 0.45) * 0.12 : 0;

    // 袍摆微摆
    robe.rotation.z = Math.sin(phase) * 0.02 * runBlend;
  };

  return {
    root,
    rightHand,
    setPalette(p: CharacterPalette) {
      mats.robe.color.set(p.robe);
      mats.trim.color.set(p.trim);
      mats.belt.color.set(p.belt);
      mats.pants.color.set(p.pants);
      mats.skin.color.set(p.skin);
      mats.hair.color.set(p.hair);
      mats.hat.color.set(p.hat);
      mats.shoe.color.set(p.shoe);
    },
    animate,
    dispose() {
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const m = o.material as THREE.Material | THREE.Material[];
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });
    },
  };
}
