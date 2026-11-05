import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CharacterPalette } from '../data/character-palettes.js';

/**
 * 中式国风角色部件库(躯干 / 四肢 / 饰件)。
 * 形制基准:国漫仙侠公子特写 — 藏青外袍 + 月白交领 V、银灰云纹肩饰、
 * 广袖内中衣窄袖、腰封青玉佩、圆头布鞋。头面见 rigHead.ts。
 * v4.1 微调:深色立领取代白色脖套、V 领前移贴合胸面(不再被埋成两个白尖角)、
 * 肩饰弧线收细、广袖收窄、深色分区对比柔化。
 * 小饰件不投影并同材质合批,守住 §4.7 draw calls 红线。
 */

export interface RigMats {
  robe: THREE.MeshStandardMaterial;
  robeDark: THREE.MeshStandardMaterial;
  sleeve: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  cuff: THREE.MeshStandardMaterial;
  inner: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
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
  jade: THREE.MeshStandardMaterial;
  crown: THREE.MeshStandardMaterial;
  gem: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
}

export function buildMats(p: CharacterPalette): RigMats {
  const mat = (color: string, rough = 0.85, metal = 0, both = false): THREE.MeshStandardMaterial =>
    new THREE.MeshStandardMaterial({
      color, roughness: rough, metalness: metal,
      side: both ? THREE.DoubleSide : THREE.FrontSide,
    });
  // 深色分区只比主色略暗,避免袍摆/袖口出现生硬的两段色差
  const dark = new THREE.Color(p.robe).multiplyScalar(0.86).getStyle();
  const gem = mat(p.gem, 0.18, 0.3);
  gem.emissive = new THREE.Color(p.gem).multiplyScalar(0.4);
  return {
    robe: mat(p.robe, 0.82),
    robeDark: mat(dark, 0.86),
    sleeve: mat(p.robe, 0.82, 0, true),
    trim: mat(p.trim, 0.75),
    cuff: mat(dark, 0.86),
    inner: mat(p.inner, 0.8, 0, true),
    accent: mat(p.accent, 0.68),
    belt: mat(p.belt, 0.7),
    pants: mat(p.pants, 0.9),
    skin: mat(p.skin, 0.6),
    hair: mat(p.hair, 0.42),
    hat: mat(p.hat, 0.8),
    shoe: mat(p.shoe, 0.8),
    eyeWhite: mat('#dfe4e6', 0.3),
    eyeDark: mat('#2b3b48', 0.3),
    mouth: mat('#c3a9a2', 0.6),
    gold: mat('#d8b46a', 0.4, 0.22),
    jade: mat(p.jade, 0.28, 0.06),
    crown: mat(p.crown, 0.34, 0.55),
    gem,
    metal: mat(p.metal, 0.36, 0.5),
  };
}

export function mesh(
  geo: THREE.BufferGeometry, m: THREE.Material,
  x = 0, y = 0, z = 0, castShadow = true,
): THREE.Mesh {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = castShadow;
  return o;
}

/** 小饰件:不投影,省一次阴影 pass */
export function deco(
  geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0,
): THREE.Mesh {
  return mesh(geo, m, x, y, z, false);
}

/**
 * 同一父组内的同材质小饰件合批:把各自变换烘焙进几何后合并成一个 Mesh。
 * 只处理 castShadow=false 的直接子 Mesh,不碰 Group(后披发/鬓发/宫绦需逐帧摆动)。
 * 材质对象保持不变,setPalette 换色仍然生效。
 */
export function collapseDeco(group: THREE.Group): void {
  const buckets = new Map<THREE.Material, THREE.Mesh[]>();
  for (const child of group.children) {
    if (!(child instanceof THREE.Mesh) || child.castShadow) continue;
    const m = child.material;
    if (Array.isArray(m)) continue;
    const list = buckets.get(m) ?? [];
    list.push(child);
    buckets.set(m, list);
  }
  for (const [m, list] of buckets) {
    if (list.length < 2) continue;
    const geos: THREE.BufferGeometry[] = [];
    for (const item of list) {
      item.updateMatrix();
      const g = item.geometry.clone();
      g.applyMatrix4(item.matrix);
      geos.push(g);
    }
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    for (const item of list) {
      group.remove(item);
      item.geometry.dispose();
    }
    group.add(mesh(merged, m, 0, 0, 0, false));
  }
}

/**
 * 深色中衣立领 + 月白交领 V。
 * V 带前移到胸面前方,让完整交领可见(此前埋进胸衣只露两个白尖角,像西装翻领)。
 */
export function makeCollar(M: RigMats): THREE.Group {
  const g = new THREE.Group();
  // 实心立领:openEnded 筒会让内部肤色透出,形成「脖子被切两截」的横条
  const stand = mesh(new THREE.CylinderGeometry(0.068, 0.074, 0.056, 12),
    M.robeDark, 0, 0.486, 0);
  const standEdge = deco(new THREE.TorusGeometry(0.07, 0.0028, 6, 16),
    M.metal, 0, 0.512, 0);
  standEdge.rotation.x = Math.PI / 2;
  g.add(stand, standEdge);

  // 月白交领 V:深色垫底略宽露出细滚边,避免纯白直条的制服翻领感
  for (const s of [-1, 1] as const) {
    const under = deco(new THREE.BoxGeometry(0.058, 0.34, 0.014), M.robeDark,
      s * 0.045, 0.36, 0.162);
    under.rotation.z = -s * 0.38;
    const v = deco(new THREE.BoxGeometry(0.042, 0.33, 0.016), M.inner,
      s * 0.045, 0.36, 0.168);
    v.rotation.z = -s * 0.38;
    g.add(under, v);
  }

  // 右衽压襟:V 尖以下一小段深色衣襟 + 玉扣
  const overlap = deco(new THREE.BoxGeometry(0.05, 0.1, 0.026), M.robe, 0.03, 0.15, 0.17);
  overlap.rotation.z = -0.38;
  const knot = deco(new THREE.SphereGeometry(0.012, 8, 7), M.jade, 0, 0.17, 0.18);
  g.add(overlap, knot);
  collapseDeco(g);
  return g;
}

/** 银灰云纹肩饰:压扁贴肩的细卷云弧,不做立体肩章 */
export function makeShoulder(M: RigMats, side: -1 | 1): THREE.Group {
  const g = new THREE.Group();
  const plate = deco(new THREE.SphereGeometry(0.088, 12, 8), M.robeDark, 0, 0.012, 0.012);
  plate.scale.set(1.05, 0.26, 0.9);
  const arc = deco(new THREE.TorusGeometry(0.038, 0.0028, 6, 12, Math.PI * 0.85),
    M.metal, 0, 0.026, 0.045);
  arc.rotation.set(0.3, 0, side * 0.2);
  arc.scale.set(1, 0.55, 0.4);
  g.add(plate, arc);
  collapseDeco(g);
  return g;
}

export interface WaistParts {
  group: THREE.Group;
  /** 宫绦(随动作摆动) */
  tassels: THREE.Group[];
}

/** 玄黑腰封 + 银线 + 玉扣 + 双宫绦 + 青玉佩 */
export function makeWaist(M: RigMats): WaistParts {
  const group = new THREE.Group();
  const seal = mesh(new THREE.CylinderGeometry(0.172, 0.176, 0.115, 12), M.belt, 0, 0.045, 0);
  group.add(seal);
  for (const y of [0.101, -0.011]) {
    const line = deco(new THREE.TorusGeometry(0.176, 0.006, 6, 18), M.metal, 0, y, 0);
    line.rotation.x = Math.PI / 2;
    group.add(line);
  }
  const buckle = deco(new THREE.CylinderGeometry(0.036, 0.036, 0.014, 12), M.jade,
    0, 0.045, 0.174);
  buckle.rotation.x = Math.PI / 2;
  const buckleCore = deco(new THREE.SphereGeometry(0.012, 8, 7), M.crown, 0, 0.045, 0.184);
  group.add(buckle, buckleCore);

  const tassels: THREE.Group[] = [];
  for (const s of [-1, 1] as const) {
    const g = new THREE.Group();
    g.position.set(s * 0.145, -0.01, 0.155);
    const cord = deco(new THREE.CylinderGeometry(0.006, 0.006, 0.36, 6), M.accent, 0, -0.18, 0);
    const bead = deco(new THREE.SphereGeometry(0.02, 10, 8), M.jade, 0, -0.37, 0);
    const fringe = deco(new THREE.ConeGeometry(0.014, 0.06, 7), M.accent, 0, -0.41, 0);
    fringe.rotation.x = Math.PI;
    g.add(cord, bead, fringe);
    group.add(g);
    tassels.push(g);
  }

  // 青玉佩:小玉环 + 蓝宝石珠 + 双股挂绳 + 短流苏,右前腰侧
  const pendant = new THREE.Group();
  pendant.position.set(0.205, -0.03, 0.19);
  const ring = deco(new THREE.TorusGeometry(0.024, 0.007, 8, 16), M.jade, 0, 0.018, 0);
  const bead = deco(new THREE.SphereGeometry(0.01, 8, 7), M.gem, 0, 0.018, 0.005);
  const cordL = deco(new THREE.CylinderGeometry(0.004, 0.004, 0.085, 6), M.hat, -0.01, -0.04, 0);
  const cordR = deco(new THREE.CylinderGeometry(0.004, 0.004, 0.085, 6), M.hat, 0.01, -0.04, 0);
  const fringe = deco(new THREE.ConeGeometry(0.013, 0.06, 7), M.accent, 0, -0.095, 0);
  fringe.rotation.x = Math.PI;
  pendant.add(ring, bead, cordL, cordR, fringe);
  collapseDeco(pendant);
  group.add(pendant);

  collapseDeco(group);
  return { group, tassels };
}

/** 直裰式袍摆:上下两段色分区 + 细金缝线 + 细月白/雾蓝滚边 */
export function makeSkirt(M: RigMats): THREE.Group {
  const g = new THREE.Group();
  const top = mesh(new THREE.CylinderGeometry(0.165, 0.2, 0.28, 12), M.robe, 0, -0.14, 0);
  const bottom = mesh(new THREE.CylinderGeometry(0.2, 0.235, 0.22, 12), M.robeDark, 0, -0.39, 0);
  const seam = deco(new THREE.CylinderGeometry(0.201, 0.203, 0.006, 12), M.crown, 0, -0.255, 0);
  const hem = mesh(new THREE.CylinderGeometry(0.237, 0.242, 0.02, 12), M.trim, 0, -0.5, 0);
  const hemLine = deco(new THREE.CylinderGeometry(0.243, 0.245, 0.008, 12), M.accent, 0, -0.48, 0);
  g.add(top, bottom, seam, hem, hemLine);
  return g;
}

/** 广袖(垂胡袖):上窄下略阔,深色袖口 + 一道细月白缘 */
export function makeSleeve(M: RigMats): THREE.Group {
  const g = new THREE.Group();
  const bell = mesh(new THREE.CylinderGeometry(0.072, 0.112, 0.34, 12, 1, true),
    M.sleeve, 0, -0.17, 0);
  const cuff = mesh(new THREE.CylinderGeometry(0.112, 0.114, 0.028, 12, 1, true),
    M.cuff, 0, -0.328, 0);
  const cuffEdge = deco(new THREE.CylinderGeometry(0.115, 0.116, 0.008, 12, 1, true),
    M.trim, 0, -0.31, 0);
  g.add(bell, cuff, cuffEdge);
  return g;
}

/** 中衣窄袖:深藏青前臂袖 + 月白袖口细缘,只留手在外,避免白衬衫筒 */
export function makeInnerSleeve(M: RigMats): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.052, 0.046, 0.25, 10), M.robeDark, 0, -0.14, 0));
  const edge = deco(new THREE.TorusGeometry(0.047, 0.006, 6, 12), M.trim, 0, -0.263, 0);
  edge.rotation.x = Math.PI / 2;
  g.add(edge);
  return g;
}

/** 圆头布鞋:圆润鞋底 + 翘头 + 月白鞋口 */
export function makeShoe(M: RigMats): THREE.Group {
  const g = new THREE.Group();
  const sole = deco(new THREE.SphereGeometry(0.062, 12, 8), M.belt, 0, -0.448, 0.045);
  sole.scale.set(1.02, 0.16, 1.35);
  const upper = mesh(new THREE.SphereGeometry(0.06, 12, 10), M.shoe, 0, -0.425, 0.04);
  upper.scale.set(1.0, 0.5, 1.3);
  const toe = deco(new THREE.SphereGeometry(0.028, 10, 8), M.shoe, 0, -0.405, 0.15);
  toe.scale.set(1.15, 0.6, 0.9);
  const vamp = deco(new THREE.BoxGeometry(0.058, 0.008, 0.045), M.trim, 0, -0.392, 0.055);
  g.add(sole, upper, toe, vamp);
  return g;
}
