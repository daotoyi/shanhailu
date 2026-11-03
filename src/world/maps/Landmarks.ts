import * as THREE from 'three';

/**
 * 七章地标(每图记忆点,PROMPT §4.3):程序化拼装,构建期放置。
 */

function mesh(geo: THREE.BufferGeometry, color: string, opts: { emissive?: string; ei?: number; metal?: number; transparent?: boolean; opacity?: number; rough?: number } = {}): THREE.Mesh {
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: opts.rough ?? 0.85,
      metalness: opts.metal ?? 0,
      emissive: opts.emissive ?? '#000000',
      emissiveIntensity: opts.ei ?? 0,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
    }),
  );
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** 九黎图腾柱 */
export function buildTotemPole(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const colors = ['#8a3b2e', '#5a6b3a', '#3a4a6b', '#6b5a3a'];
  for (let i = 0; i < 4; i++) {
    const seg = mesh(new THREE.CylinderGeometry(0.55 - i * 0.06, 0.62 - i * 0.06, 1.1, 7), colors[i]!);
    seg.position.y = 0.55 + i * 1.1;
    g.add(seg);
  }
  const top = mesh(new THREE.OctahedronGeometry(0.5), '#c9a25c', { metal: 0.5, emissive: '#c9a25c', ei: 0.3 });
  top.position.y = 5.0;
  g.add(top);
  g.position.set(x, 0, z);
  return g;
}

/** 扶桑神树(全游戏最强视觉锤:金色巨树+十日余辉) */
export function buildFusangTree(x: number, z: number): { group: THREE.Group; colliders: { x: number; z: number; r: number }[] } {
  const g = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(1.1, 2.6, 16, 9), '#8a5a2a', { rough: 0.95 });
  trunk.position.y = 8;
  g.add(trunk);
  // 金色枝冠
  const canopyMat = { emissive: '#ffd45e', ei: 0.55, color: '#d8a83a' };
  for (const [ox, oy, oz, s] of [
    [0, 17, 0, 4.6], [3.2, 15.4, 1.2, 3.0], [-3.4, 15.8, -0.8, 3.2],
    [1.4, 15.2, -3.0, 2.6], [-1.8, 16.4, 2.6, 2.8], [0.4, 13.8, 3.4, 2.2],
  ] as const) {
    const blob = mesh(new THREE.IcosahedronGeometry(s, 1), canopyMat.color!, canopyMat);
    blob.position.set(ox, oy, oz);
    g.add(blob);
  }
  // 悬日(九枚小金球环绕,纪念十日并出)
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const sun = mesh(new THREE.SphereGeometry(0.5, 8, 6), '#ffcf4a', { emissive: '#ffb42a', ei: 2.2 });
    sun.position.set(Math.cos(a) * 6.5, 14 + Math.sin(a * 2) * 2.2, Math.sin(a) * 6.5);
    g.add(sun);
  }
  g.position.set(x, 0, z);
  return { group: g, colliders: [{ x, z, r: 3.2 }] };
}

/** 蜃楼幻塔(半透明) */
export function buildMirageTower(x: number, z: number, h = 12): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const seg = mesh(new THREE.BoxGeometry(3.4 - i * 0.4, h / 5, 3.4 - i * 0.4), '#7fc8d8', {
      transparent: true, opacity: 0.42, emissive: '#5fa8c8', ei: 0.3,
    });
    seg.position.y = h / 10 + (i * h) / 5;
    seg.rotation.y = i * 0.14;
    seg.castShadow = false;
    g.add(seg);
  }
  g.position.set(x, 0, z);
  return g;
}

/** 昆仑雪峰群 */
export function buildJadePeaks(cx: number, cz: number): THREE.Group {
  const g = new THREE.Group();
  for (const [ox, oz, h, r] of [[0, 0, 26, 7], [10, 6, 18, 5], [-9, 5, 20, 5.5], [4, -8, 14, 4.4]] as const) {
    const peak = mesh(new THREE.ConeGeometry(r, h, 7), '#e8ecf2', { rough: 0.7 });
    peak.position.set(cx + ox, h / 2 - 1, cz + oz);
    g.add(peak);
    const cap = mesh(new THREE.ConeGeometry(r * 0.42, h * 0.24, 7), '#ffffff', { emissive: '#bcd8f0', ei: 0.15 });
    cap.position.set(cx + ox, h - h * 0.12 - 1, cz + oz);
    g.add(cap);
  }
  return g;
}

/** 幽都鬼灯阵 + 幽冥门 */
export function buildGhostGate(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const postMat = '#3a2a4a';
  for (const s of [-1, 1]) {
    const post = mesh(new THREE.CylinderGeometry(0.28, 0.34, 6.5, 6), postMat);
    post.position.set(x + s * 2.4, 3.25, z);
    g.add(post);
  }
  const beam = mesh(new THREE.BoxGeometry(6.4, 0.55, 0.5), postMat);
  beam.position.set(x, 6.4, z);
  g.add(beam);
  const plaque = mesh(new THREE.BoxGeometry(1.6, 0.7, 0.14), '#17130e', { emissive: '#7a4fb0', ei: 0.5 });
  plaque.position.set(x, 6.4, z + 0.3);
  g.add(plaque);
  // 鬼火
  for (let i = 0; i < 7; i++) {
    const fire = mesh(new THREE.OctahedronGeometry(0.16), '#a878e0', { emissive: '#8a5fe0', ei: 2.2 });
    fire.position.set(x + Math.sin(i * 2.3) * 4, 1.4 + Math.abs(Math.sin(i * 1.7)) * 2.4, z + Math.cos(i * 1.9) * 4);
    g.add(fire);
  }
  return g;
}

/** 水泽栈道 */
export function buildBoardwalk(x: number, z: number, len = 14, rotY = 0): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < len; i += 1.4) {
    const plank = mesh(new THREE.BoxGeometry(2.0, 0.14, 1.1), '#6b5238');
    plank.position.set(Math.sin(rotY) * i, 0.42, Math.cos(rotY) * i);
    g.add(plank);
    if (i % 2.8 === 0) {
      const post = mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.1, 5), '#54402e');
      post.position.set(Math.sin(rotY) * i, -0.1, Math.cos(rotY) * i);
      g.add(post);
    }
  }
  g.position.set(x, 0, z);
  return g;
}

/** 不周断柱 + 天光裂缝 */
export function buildBrokenPillar(x: number, z: number): { group: THREE.Group; colliders: { x: number; z: number; r: number }[] } {
  const g = new THREE.Group();
  // 断柱(倾斜巨柱)
  const pillar = mesh(new THREE.CylinderGeometry(3.2, 4.6, 30, 9), '#6a6a62', { rough: 0.95 });
  pillar.position.set(x, 12, z);
  pillar.rotation.z = 0.22;
  g.add(pillar);
  // 断口发光(天光自裂缝漏下)
  const crack = mesh(new THREE.CylinderGeometry(3.3, 3.5, 1.2, 9), '#cfe8ff', { emissive: '#9fd0ff', ei: 1.6, transparent: true, opacity: 0.6 });
  crack.position.set(x - 3.1, 24.5, z);
  crack.rotation.z = 0.22;
  g.add(crack);
  // 天光束
  const beam = mesh(new THREE.CylinderGeometry(1.6, 3.4, 34, 8, 1, true), '#9fd0ff', {
    emissive: '#9fd0ff', ei: 0.5, transparent: true, opacity: 0.14,
  });
  beam.position.set(x - 6, 30, z + 3);
  beam.castShadow = false;
  g.add(beam);
  return { group: g, colliders: [{ x, z, r: 4.6 }] };
}
