import * as THREE from 'three';
import type { BeastDef } from '../data/bestiary.js';

/**
 * 异兽程序化拼装外观(PROMPT §4.3):几何拼装+分区材质+粒子光效;
 * 野怪与契约协战共用;MVP 程序动作(正弦浮动/游动/扑击)。
 */

export interface BeastBody {
  group: THREE.Group;
  /** 动画钩子(elapsed) */
  animate(elapsed: number, moving: boolean): void;
}

function mat(color: string, opts: { emissive?: string; ei?: number; rough?: number } = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: opts.rough ?? 0.9,
    emissive: opts.emissive ?? '#000000',
    emissiveIntensity: opts.ei ?? 0,
  });
}

/** 九尾狐 */
function buildFox9(): BeastBody {
  const g = new THREE.Group();
  const fur = mat('#e8d8c8', { rough: 0.95 });
  const tailMat = mat('#f2d0b0', { emissive: '#e8a06a', ei: 0.25 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 4, 8), fur);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 7), fur);
  head.position.set(0, 0.78, 0.62);
  const earGeo = new THREE.ConeGeometry(0.09, 0.26, 5);
  const eL = new THREE.Mesh(earGeo, fur);
  eL.position.set(-0.13, 1.02, 0.6);
  const eR = eL.clone();
  eR.position.x = 0.13;
  const eyeMat = mat('#3a2a20', { emissive: '#ffb45e', ei: 1.2 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), eyeMat);
  eyeL.position.set(-0.1, 0.82, 0.84);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.1;
  const muzzle = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 6), fur);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.74, 0.88);
  g.add(body, head, eL, eR, eyeL, eyeR, muzzle);
  // 九尾(扇形排列,正弦摇摆)
  const tails: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.85, 5), tailMat);
    const a = ((i - 4) / 4) * 0.85;
    t.position.set(Math.sin(a) * 0.3, 0.62 + Math.cos(a) * 0.1, -0.75);
    t.rotation.x = 1.9;
    t.rotation.z = -a;
    t.castShadow = true;
    g.add(t);
    tails.push(t);
  }
  // 四足
  for (const [lx, lz] of [[-0.2, 0.4], [0.2, 0.4], [-0.2, -0.35], [0.2, -0.35]] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.5, 5), fur);
    leg.position.set(lx, 0.25, lz);
    g.add(leg);
  }
  return {
    group: g,
    animate(elapsed, moving) {
      tails.forEach((t, i) => {
        t.rotation.z = -(((i - 4) / 4) * 0.85) + Math.sin(elapsed * 2.2 + i * 0.7) * 0.16;
      });
      if (moving) g.position.y = Math.abs(Math.sin(elapsed * 7)) * 0.06;
      head.rotation.y = Math.sin(elapsed * 0.9) * 0.2;
    },
  };
}

/** 鹿蜀(马身虎纹) */
function buildLushu(): BeastBody {
  const g = new THREE.Group();
  const coat = mat('#c8a878');
  const stripe = mat('#5a4632');
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.05, 4, 8), coat);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.95;
  g.add(body);
  // 虎纹(环带)
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.045, 5, 12), stripe);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(0.45 - i * 0.3, 0.95, 0);
    g.add(ring);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 7), mat('#e8e0d0'));
  head.position.set(0, 1.28, 0.85);
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.3), mat('#e8e0d0'));
  muzzle.position.set(0, 1.2, 1.08);
  const earGeo = new THREE.ConeGeometry(0.08, 0.22, 5);
  const eL = new THREE.Mesh(earGeo, coat);
  eL.position.set(-0.13, 1.56, 0.8);
  const eR = eL.clone();
  eR.position.x = 0.13;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), mat('#2b2018', { emissive: '#c9a25c', ei: 0.8 }));
  eye.position.set(-0.12, 1.34, 1.02);
  const eye2 = eye.clone();
  eye2.position.x = 0.12;
  g.add(head, muzzle, eL, eR, eye, eye2);
  // 赤尾
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6, 6), mat('#c05a42'));
  tail.position.set(0, 1.05, -0.85);
  tail.rotation.x = -1.1;
  g.add(tail);
  // 四长腿
  for (const [lx, lz] of [[-0.26, 0.6], [0.26, 0.6], [-0.26, -0.55], [0.26, -0.55]] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.95, 5), coat);
    leg.position.set(lx, 0.48, lz);
    g.add(leg);
  }
  return {
    group: g,
    animate(elapsed, moving) {
      tail.rotation.z = Math.sin(elapsed * 3) * 0.2;
      if (moving) {
        g.children.forEach((c, i) => {
          if (i > 7) c.rotation.x = Math.sin(elapsed * 8 + i) * 0.3;
        });
      }
      head.rotation.y = Math.sin(elapsed * 0.7) * 0.25;
    },
  };
}

/** 毕方(独足火鸟) */
function buildBifang(): BeastBody {
  const g = new THREE.Group();
  const bodyMat = mat('#2f5a6a', { rough: 0.85 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.5, 4, 8), bodyMat);
  body.rotation.x = Math.PI / 2;
  body.position.y = 1.3;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 7), bodyMat);
  head.position.set(0, 1.62, 0.42);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.26, 6), mat('#e8e2d3'));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 1.58, 0.66);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), mat('#ffb45e', { emissive: '#ff6a2a', ei: 2 }));
  eye.position.set(-0.09, 1.66, 0.56);
  const eye2 = eye.clone();
  eye2.position.x = 0.09;
  g.add(body, head, beak, eye, eye2);
  // 青羽赤纹翅膀
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.42), mat('#3f6f5f', { emissive: '#c04a32', ei: 0.35 }));
    wing.position.set(s * 0.5, 1.42, 0);
    wing.rotation.z = s * 0.18;
    g.add(wing);
    (g as { wings?: THREE.Mesh[] }).wings = (g as { wings?: THREE.Mesh[] }).wings ?? [];
    (g as { wings?: THREE.Mesh[] }).wings!.push(wing);
  }
  // 独足
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.85, 5), mat('#c9a25c'));
  leg.position.y = 0.55;
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.3), mat('#c9a25c'));
  foot.position.y = 0.12;
  g.add(leg, foot);
  // 火焰粒子(发光小四面体环绕)
  const flames: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.07),
      new THREE.MeshStandardMaterial({ color: '#ff9a4a', emissive: '#ff6a1a', emissiveIntensity: 2.2 }),
    );
    g.add(f);
    flames.push(f);
  }
  const wings = (g as { wings?: THREE.Mesh[] }).wings!;
  return {
    group: g,
    animate(elapsed) {
      wings.forEach((w, i) => {
        w.rotation.z = (i === 0 ? 1 : -1) * (0.18 + Math.sin(elapsed * 6) * 0.35);
      });
      flames.forEach((f, i) => {
        const a = elapsed * 1.8 + i;
        f.position.set(Math.cos(a) * 0.34, 1.9 + Math.sin(a * 1.3) * 0.14, Math.sin(a) * 0.34);
        f.rotation.y += 0.1;
      });
      g.position.y = Math.sin(elapsed * 2.4) * 0.1;
    },
  };
}

export function buildBeastBody(def: BeastDef): BeastBody {
  switch (def.body) {
    case 'fox9': return buildFox9();
    case 'lushu': return buildLushu();
    case 'bifang': return buildBifang();
    default: return buildFox9();
  }
}
