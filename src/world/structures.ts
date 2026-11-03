import * as THREE from 'three';

/**
 * 共享程序化建筑构件库(药庐/城门/铺面/传送阵/篱笆/灯柱)。
 * 全部风格化几何拼装 + flatShading;返回 Group 并登记碰撞体。
 */

export interface StructResult {
  group: THREE.Group;
  colliders: { x: number; z: number; r: number }[];
}

function m(geo: THREE.BufferGeometry, color: string, opts: { metal?: number; rough?: number; emissive?: string } = {}): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: opts.rough ?? 0.9,
    metalness: opts.metal ?? 0,
    emissive: opts.emissive ?? '#000000',
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** 药庐:木墙+人字坡顶+晒药架 */
export function buildHerbHut(x: number, z: number, rotY = 0): StructResult {
  const g = new THREE.Group();
  const wood = '#6b5238';
  const wall = '#8a7355';
  const W = 4.2;
  // 台基
  const base = m(new THREE.BoxGeometry(W + 0.8, 0.3, W + 0.8), '#7a7d72');
  base.position.set(0, 0.15, 0);
  g.add(base);
  // 四墙(留门洞:前墙两段)
  const wallH = 2.1;
  const back = m(new THREE.BoxGeometry(W, wallH, 0.18), wall, { rough: 0.95 });
  back.position.set(0, 0.3 + wallH / 2, -W / 2);
  const left = m(new THREE.BoxGeometry(0.18, wallH, W), wall, { rough: 0.95 });
  left.position.set(-W / 2, 0.3 + wallH / 2, 0);
  const right = m(new THREE.BoxGeometry(0.18, wallH, W), wall, { rough: 0.95 });
  right.position.set(W / 2, 0.3 + wallH / 2, 0);
  const frontL = m(new THREE.BoxGeometry(W / 2 - 0.55, wallH, 0.18), wall, { rough: 0.95 });
  frontL.position.set(-(W / 4 + 0.275), 0.3 + wallH / 2, W / 2);
  const frontR = frontL.clone();
  frontR.position.x = W / 4 + 0.275;
  g.add(back, left, right, frontL, frontR);
  // 人字坡顶(两块斜板 + 脊)
  const roofL = m(new THREE.BoxGeometry(W + 1.2, 0.12, W / 2 + 0.9), '#41586b');
  roofL.position.set(0, 3.05, -W / 4 - 0.1);
  roofL.rotation.x = 0.5;
  const roofR = m(new THREE.BoxGeometry(W + 1.2, 0.12, W / 2 + 0.9), '#41586b');
  roofR.position.set(0, 3.05, W / 4 + 0.1);
  roofR.rotation.x = -0.5;
  const ridge = m(new THREE.BoxGeometry(W + 1.4, 0.14, 0.24), '#2b2018');
  ridge.position.set(0, 3.72, 0);
  g.add(roofL, roofR, ridge);
  // 门框
  const lintel = m(new THREE.BoxGeometry(1.2, 0.16, 0.2), wood);
  lintel.position.set(0, 2.3, W / 2);
  g.add(lintel);
  // 晒药架(两柱一横杆+药串)
  const rackX = W / 2 + 1.1;
  for (const rz of [-0.8, 0.8]) {
    const post = m(new THREE.CylinderGeometry(0.06, 0.07, 1.5, 6), wood);
    post.position.set(rackX, 1.05, rz);
    g.add(post);
  }
  const bar = m(new THREE.CylinderGeometry(0.045, 0.045, 1.7, 6), wood);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(rackX, 1.72, 0);
  g.add(bar);
  for (const [hx, hz] of [[-0.5, 0], [0, 0], [0.5, 0]] as const) {
    const bundle = m(new THREE.SphereGeometry(0.13, 6, 5), hx === 0 ? '#b03a2e' : '#3f6f5f');
    bundle.position.set(rackX + hx, 1.56, hz);
    bundle.scale.y = 1.5;
    g.add(bundle);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  const colliders = [
    { x, z, r: 3.2 },
  ];
  return { group: g, colliders };
}

/** 传送阵:石台+符文环(发光旋转)+四柱 */
export function buildTeleporterPad(): { group: THREE.Group; ring: THREE.Group; glow: THREE.Mesh; runeMat: THREE.MeshStandardMaterial } {
  const g = new THREE.Group();
  const base = m(new THREE.CylinderGeometry(2.5, 2.8, 0.4, 12), '#6f7468');
  base.position.y = 0.2;
  const plate = m(new THREE.CylinderGeometry(2.1, 2.2, 0.14, 12), '#565c54');
  plate.position.y = 0.46;
  g.add(base, plate);
  // 发光符文环(八段环带)
  const runeMat = new THREE.MeshStandardMaterial({
    color: '#8fe0c8',
    emissive: '#3fd2a8',
    emissiveIntensity: 1.8,
    flatShading: true,
  });
  const ring = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.3), runeMat);
    const a = (i / 8) * Math.PI * 2;
    seg.position.set(Math.cos(a) * 1.6, 0.56, Math.sin(a) * 1.6);
    seg.rotation.y = -a;
    ring.add(seg);
  }
  const glow = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 1.9, 0.05, 16),
    new THREE.MeshStandardMaterial({ color: '#3fd2a8', emissive: '#3fd2a8', emissiveIntensity: 0.9, transparent: true, opacity: 0.22 }),
  );
  glow.position.y = 0.54;
  g.add(ring, glow);
  // 四柱
  for (const [px, pz] of [[-2.1, -2.1], [2.1, -2.1], [-2.1, 2.1], [2.1, 2.1]] as const) {
    const post = m(new THREE.CylinderGeometry(0.14, 0.18, 2.0, 6), '#6f7468');
    post.position.set(px, 1.4, pz);
    const cap = m(new THREE.OctahedronGeometry(0.2), '#c9a25c', { metal: 0.6, rough: 0.35 });
    cap.position.set(px, 2.55, pz);
    g.add(post, cap);
  }
  return { group: g, ring, glow, runeMat };
}

/** 城门楼(大荒城记忆点):双墩+匾额+重檐+灯笼 */
export function buildGateArch(x: number, z: number, rotY = 0): StructResult {
  const g = new THREE.Group();
  const stone = '#8b8a80';
  const wood = '#5a2c22';
  const tile = '#37545c';
  const gold = '#c9a25c';
  // 双门墩
  for (const s of [-1, 1]) {
    const pier = m(new THREE.BoxGeometry(2.2, 5.2, 2.2), stone);
    pier.position.set(s * 4.2, 2.6, 0);
    g.add(pier);
    const cap = m(new THREE.BoxGeometry(2.6, 0.35, 2.6), wood);
    cap.position.set(s * 4.2, 5.35, 0);
    g.add(cap);
  }
  // 匾额横梁
  const beam = m(new THREE.BoxGeometry(8.4, 0.9, 1.0), wood);
  beam.position.set(0, 4.6, 0);
  g.add(beam);
  const plaque = m(new THREE.BoxGeometry(2.4, 0.62, 0.14), '#17130e');
  plaque.position.set(0, 4.6, 0.5);
  g.add(plaque);
  for (const s of [-1, 1]) {
    const inlay = m(new THREE.BoxGeometry(0.5, 0.5, 0.1), gold, { metal: 0.5, rough: 0.4 });
    inlay.position.set(s * 0.75, 4.6, 0.56);
    g.add(inlay);
  }
  // 重檐
  const roof1 = m(new THREE.ConeGeometry(6.4, 1.6, 4), tile);
  roof1.rotation.y = Math.PI / 4;
  roof1.position.set(0, 6.2, 0);
  const roof2 = m(new THREE.ConeGeometry(4.4, 1.5, 4), tile);
  roof2.rotation.y = Math.PI / 4;
  roof2.position.set(0, 7.6, 0);
  const finial = m(new THREE.SphereGeometry(0.3, 8, 8), gold, { metal: 0.6, rough: 0.35 });
  finial.position.set(0, 8.5, 0);
  g.add(roof1, roof2, finial);
  // 垂灯笼
  const lampMat = new THREE.MeshStandardMaterial({ color: '#ff6a4a', emissive: '#ff4a2a', emissiveIntensity: 1.6 });
  for (const s of [-1, 1]) {
    const cord = m(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4), '#2b2018');
    cord.position.set(s * 4.2, 4.75, 1.0);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), lampMat);
    lamp.position.set(s * 4.2, 4.2, 1.0);
    lamp.scale.y = 1.2;
    g.add(cord, lamp);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return { group: g, colliders: [{ x: x - 4.2, z, r: 1.9 }, { x: x + 4.2, z, r: 1.9 }] };
}

/** 铺面:盒身+出檐+幌子 */
export function buildShopStall(x: number, z: number, rotY: number, awningColor: string): StructResult {
  const g = new THREE.Group();
  const body = m(new THREE.BoxGeometry(4.4, 2.6, 3.4), '#8a7355', { rough: 0.95 });
  body.position.y = 1.6;
  const awning = m(new THREE.BoxGeometry(5.0, 0.12, 1.7), awningColor, { rough: 0.85 });
  awning.position.set(0, 2.9, 2.2);
  awning.rotation.x = 0.18;
  const pole1 = m(new THREE.CylinderGeometry(0.05, 0.06, 2.4, 6), '#5a4a32');
  pole1.position.set(-1.7, 1.2, 2.9);
  const banner = m(new THREE.BoxGeometry(0.5, 1.3, 0.04), awningColor, { rough: 0.9 });
  banner.position.set(-1.7, 1.7, 2.9);
  g.add(body, awning, pole1, banner);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return { group: g, colliders: [{ x, z, r: 2.9 }] };
}

/** 篱笆药田:四畦药垄+篱笆围栏 */
export function buildHerbGarden(x: number, z: number, rotY = 0): StructResult & { plantSpots: [number, number][] } {
  const g = new THREE.Group();
  const soil = '#6b5136';
  const plantSpots: [number, number][] = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const bed = m(new THREE.BoxGeometry(3.4, 0.28, 1.5), soil, { rough: 1 });
      bed.position.set(col * 4.4 - 2.2, 0.14, row * 2.8 - 1.4);
      g.add(bed);
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 2; j++) {
          const px = col * 4.4 - 2.2 + i * 0.9 - 1.35;
          const pz = row * 2.8 - 1.4 + j * 0.7 - 0.35;
          const sprout = m(new THREE.IcosahedronGeometry(0.16, 0), i % 3 === 0 ? '#5f8f6a' : '#4a7a55');
          sprout.position.set(px, 0.4, pz);
          sprout.scale.y = 1.4;
          g.add(sprout);
          if (i % 3 === 0) plantSpots.push([px, pz]);
        }
      }
    }
  }
  // 篱笆
  const fenceColor = '#8a7355';
  const W = 9.2;
  const D = 6.4;
  const posts: [number, number][] = [];
  for (let i = 0; i <= 4; i++) {
    posts.push([i * W / 4 - W / 2, -D / 2], [i * W / 4 - W / 2, D / 2]);
  }
  for (const [px, pz] of posts) {
    const post = m(new THREE.BoxGeometry(0.14, 0.9, 0.14), fenceColor);
    post.position.set(px, 0.45, pz);
    g.add(post);
  }
  for (const rz of [-D / 2, D / 2]) {
    const rail = m(new THREE.BoxGeometry(W, 0.09, 0.09), fenceColor);
    rail.position.set(0, 0.62, rz);
    g.add(rail);
  }
  for (const rx of [-W / 2, W / 2]) {
    const rail = m(new THREE.BoxGeometry(0.09, 0.09, D), fenceColor);
    rail.position.set(rx, 0.62, 0);
    g.add(rail);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return { group: g, colliders: [], plantSpots };
}

/** 石灯笼柱(发光) */
export function buildLanternPost(x: number, z: number, color = '#ffb45e'): THREE.Group {
  const g = new THREE.Group();
  const post = m(new THREE.CylinderGeometry(0.09, 0.12, 2.2, 6), '#565c54');
  post.position.y = 1.1;
  const lampMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.0 });
  const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), lampMat);
  lamp.position.y = 2.4;
  const cap = m(new THREE.ConeGeometry(0.3, 0.24, 6), '#37545c');
  cap.position.y = 2.72;
  g.add(post, lamp, cap);
  g.position.set(x, 0, z);
  return g;
}

/**
 * 烘焙小地图底图(RGBA 像素):高度+坡度上色,与地形同色系。
 * 隔行采样(step=2)后块填充,构建耗时降为 1/4。
 * sampler(x,z) → {h, slope};size×size。
 */
export function bakeMinimap(
  size: number,
  worldRadius: number,
  sampler: (x: number, z: number) => { h: number; slope: number; tint?: [number, number, number] },
): { pixels: Uint8ClampedArray; size: number; worldRadius: number } {
  const pixels = new Uint8ClampedArray(size * size * 4);
  const colorAt = (px: number, py: number): [number, number, number] => {
    const wx = ((px + 0.5) / size - 0.5) * worldRadius * 2;
    const wz = ((py + 0.5) / size - 0.5) * worldRadius * 2;
    const { h, slope, tint } = sampler(wx, wz);
    if (tint) return tint;
    if (h < -0.8) return [21, 80, 74];        // 水
    if (h < -0.2) return [156, 138, 98];      // 砂
    if (slope > 0.5 || h > 22) return [122, 125, 114]; // 岩
    const t = Math.min(1, Math.max(0, (h + 2) / 14));
    return [78 + t * 30, 122 - t * 14, 85];   // 草地明暗
  };
  const STEP = 2;
  for (let py = 0; py < size; py += STEP) {
    for (let px = 0; px < size; px += STEP) {
      const [r, g, b] = colorAt(px, py);
      for (let dy = 0; dy < STEP; dy++) {
        for (let dx = 0; dx < STEP; dx++) {
          const i = ((py + dy) * size + (px + dx)) * 4;
          pixels[i] = r;
          pixels[i + 1] = g;
          pixels[i + 2] = b;
          pixels[i + 3] = 255;
        }
      }
    }
  }
  return { pixels, size, worldRadius };
}
