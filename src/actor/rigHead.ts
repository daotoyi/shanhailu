import * as THREE from 'three';
import { deco, mesh, collapseDeco } from './rigParts.js';
import type { RigMats } from './rigParts.js';

/**
 * 头面:参照国漫仙侠公子特写 — 墨黑束发、低矮金质卷云冠嵌蓝宝石、
 * 垂肩长鬓发、剑眉细长凤眼、瘦长脸、露额。
 * v4.1 微调:提高球冠分段并前推发层以消除额前皮肤穿出的方块台阶;
 * 删除重复眼睫线(四道眉);鬓发改连续曲线发缕(不再断裂成黑柱);
 * 后披发改连续发幕 + 参差发梢(不再是叠片串)。
 * 低模取舍:不做写实五官浮雕。拆分为独立文件,避免超过 §8.5 的 400 行上限。
 */

export interface HeadParts {
  head: THREE.Group;
  /** 脑后长披发(随动作摆动) */
  backHair: THREE.Group;
  /** 左右垂肩长鬓发(随动作摆动) */
  sideLocks: THREE.Group[];
}

export function makeHead(M: RigMats): HeadParts {
  const head = new THREE.Group();
  head.position.y = 0.62;

  /* 脸型:窄长、下颌贴合;高阶分段消除球体相交处的多边形台阶 */
  const skull = mesh(new THREE.SphereGeometry(0.142, 24, 20), M.skin, 0, 0.055, 0);
  skull.scale.set(0.84, 1.18, 0.9);
  const jaw = mesh(new THREE.SphereGeometry(0.088, 16, 12), M.skin, 0, -0.055, -0.012);
  jaw.scale.set(0.7, 0.68, 0.86);
  head.add(skull, jaw);

  /* 头顶发层:前推 + 加厚 z,让黑发完整包住额前皮肤,发际线成平滑弧 */
  const hairBack = deco(
    new THREE.SphereGeometry(0.15, 32, 22, 0, Math.PI * 2, 0, Math.PI * 0.5),
    M.hair, 0, 0.1, -0.024,
  );
  hairBack.scale.set(1.0, 1.02, 1.08);
  head.add(hairBack);

  /* 钝圆高髻 */
  const bun = deco(new THREE.SphereGeometry(0.072, 14, 12), M.hair, 0, 0.185, -0.035);
  bun.scale.set(1.15, 0.7, 1.0);
  const bunTop = deco(new THREE.SphereGeometry(0.05, 12, 10), M.hair, 0, 0.24, -0.045);
  bunTop.scale.set(1.0, 0.8, 0.9);
  head.add(bun, bunTop);

  /* 低矮金质卷云冠 + 蓝宝石:整体略前移,避免被加厚的发层吞没;
     翼片压扁贴头,去掉牛角/尖刺感 */
  const crownRing = deco(new THREE.TorusGeometry(0.075, 0.009, 8, 18), M.crown,
    0, 0.192, 0.025);
  crownRing.rotation.x = Math.PI / 2 - 0.22;
  head.add(crownRing);
  for (const s of [-1, 1] as const) {
    const wing = deco(new THREE.SphereGeometry(0.03, 10, 8), M.crown,
      s * 0.072, 0.212, 0.038);
    wing.scale.set(0.8, 0.62, 0.28);
    wing.rotation.z = -s * 0.3;
    const curl = deco(new THREE.TorusGeometry(0.022, 0.006, 6, 12, Math.PI * 0.9),
      M.crown, s * 0.098, 0.208, 0.04);
    curl.rotation.set(0, 0, s * 0.4);
    head.add(wing, curl);
  }
  const gem = deco(new THREE.OctahedronGeometry(0.024, 0), M.gem, 0, 0.222, 0.105);
  gem.scale.set(0.8, 1.15, 0.5);
  const gemSeat = deco(new THREE.TorusGeometry(0.026, 0.004, 6, 12), M.crown,
    0, 0.222, 0.1);
  head.add(gem, gemSeat);

  /* 脑后长披发:圆顶 + 五段无盖渐变发幕(无顶底盖,避免横向接缝) + 圆润封底 */
  const backHair = new THREE.Group();
  backHair.position.set(0, 0.16, -0.135);
  const cap = deco(new THREE.SphereGeometry(0.096, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    M.hair, 0, 0, -0.01);
  cap.scale.set(1.2, 0.85, 0.68);
  backHair.add(cap);
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const rTop = 0.092 + t * 0.022;
    const rBot = 0.092 + (t + 0.25) * 0.022;
    const seg = deco(new THREE.CylinderGeometry(rTop, rBot, 0.17, 14, 1, true), M.hair,
      0, -0.08 - i * 0.1, -0.01);
    seg.scale.set(1.2, 1, 0.68);
    backHair.add(seg);
  }
  const tail = deco(new THREE.SphereGeometry(0.1195, 14, 10, 0, Math.PI * 2,
    Math.PI * 0.5, Math.PI * 0.5), M.hair, 0, -0.565, -0.01);
  tail.scale.set(1.2, 0.5, 0.68);
  backHair.add(tail);
  for (const s of [-1, 1] as const) {
    const wisp = deco(new THREE.CylinderGeometry(0.02, 0.008, 0.42, 7), M.hair,
      s * 0.115, -0.25, 0.02);
    wisp.rotation.z = s * 0.08;
    wisp.scale.set(1, 1, 0.5);
    backHair.add(wisp);
  }
  collapseDeco(backHair);
  head.add(backHair);

  /* 垂肩长鬓发:连续曲线发缕 + 细伴缕 + 渐细发梢,贴脸侧自然垂落 */
  const sideLocks: THREE.Group[] = [];
  for (const s of [-1, 1] as const) {
    const g = new THREE.Group();
    g.position.set(s * 0.142, 0.09, 0);
    const mainCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.04, -0.02),
      new THREE.Vector3(s * 0.014, -0.1, 0.01),
      new THREE.Vector3(s * 0.032, -0.24, 0.04),
      new THREE.Vector3(s * 0.03, -0.38, 0.075),
      new THREE.Vector3(s * 0.014, -0.47, 0.09),
    ]);
    const strand = deco(new THREE.TubeGeometry(mainCurve, 24, 0.0125, 7, false), M.hair);
    const sideCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.012, 0.02, -0.035),
      new THREE.Vector3(s * 0.028, -0.12, -0.015),
      new THREE.Vector3(s * 0.044, -0.27, 0.02),
      new THREE.Vector3(s * 0.04, -0.4, 0.055),
    ]);
    const companion = deco(new THREE.TubeGeometry(sideCurve, 18, 0.007, 6, false), M.hair);
    const tip = deco(new THREE.ConeGeometry(0.0125, 0.05, 7), M.hair,
      s * 0.014, -0.49, 0.09);
    tip.rotation.x = Math.PI;
    tip.scale.set(1, 1, 0.6);
    g.add(strand, companion, tip);
    collapseDeco(g);
    head.add(g);
    sideLocks.push(g);
  }

  /* 五官:单道剑眉 + 细长凤眼(眼线用深灰蓝细条,不再与眉形成「四道眉」) */
  for (const s of [-1, 1] as const) {
    const brow = deco(new THREE.BoxGeometry(0.058, 0.008, 0.011), M.hair,
      s * 0.055, 0.089, 0.131);
    brow.rotation.z = s * 0.24;
    const browTail = deco(new THREE.BoxGeometry(0.024, 0.005, 0.009), M.hair,
      s * 0.09, 0.098, 0.128);
    browTail.rotation.z = s * 0.55;
    const white = deco(new THREE.SphereGeometry(0.032, 12, 8), M.eyeWhite,
      s * 0.054, 0.048, 0.128);
    white.scale.set(1.35, 0.26, 0.42);
    white.rotation.z = s * 0.18;
    const iris = deco(new THREE.SphereGeometry(0.013, 10, 8), M.eyeDark,
      s * 0.054, 0.047, 0.14);
    iris.scale.set(1.05, 0.82, 0.5);
    const glint = deco(new THREE.SphereGeometry(0.0035, 6, 5), M.eyeWhite,
      s * 0.049, 0.051, 0.15);
    const lash = deco(new THREE.BoxGeometry(0.062, 0.004, 0.008), M.eyeDark,
      s * 0.054, 0.062, 0.132);
    lash.rotation.z = s * 0.18;
    const ear = deco(new THREE.SphereGeometry(0.019, 8, 7), M.skin,
      s * 0.128, 0.04, 0.006);
    ear.scale.set(0.4, 0.9, 0.7);
    head.add(brow, browTail, white, iris, glint, lash, ear);
  }
  const noseTip = deco(new THREE.SphereGeometry(0.005, 8, 6), M.skin, 0, -0.01, 0.132);
  noseTip.scale.set(1, 0.75, 0.6);
  const lip = deco(new THREE.BoxGeometry(0.018, 0.0018, 0.004), M.mouth, 0, -0.05, 0.126);
  head.add(noseTip, lip);

  collapseDeco(head);
  return { head, backHair, sideLocks };
}
