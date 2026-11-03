import * as THREE from 'three';
import { buildThemeMap, type ThemeSpec } from './GenericThemeMap.js';
import { buildTotemPole, buildFusangTree, buildMirageTower, buildJadePeaks, buildGhostGate, buildBoardwalk, buildBrokenPillar } from './Landmarks.js';
import { buildShopStall, buildTeleporterPad, bakeMinimap } from '../structures.js';
import type { BuiltMap, MapDefinition } from './types.js';

/**
 * 七章地图(M7 内容采样):参数化主题 + 每图地标 + 传送链。
 * 传送链:药王谷 ↔ 大荒城;大荒城另设「南征门」→ 九黎;每章图设 前进门(北)+ 回城门(东)。
 */

/** 章节图通用:回城门(东) */
const baseSpawns = (boundsRadius: number): MapDefinition['spawns'] => [
  { id: 'entry', pos: [0, boundsRadius * 0.42 - 6], heading: Math.PI },
  { id: 'from-frontier', pos: [-3, boundsRadius * 0.42 - 6], heading: Math.PI },
];

/* ================= 第二章:九黎南疆 ================= */
const jiuliSpec: ThemeSpec = {
  id: 'jiuli-nanjiang',
  name: '九黎南疆',
  epigraph: '铜鼓声声,苗寨禁地',
  boundsRadius: 96,
  env: {
    fogColor: '#7a6a55', fogDensity: 0.011,
    sunDir: [0.3, 0.5, -0.6], sunColor: '#e8b07a', sunIntensity: 2.2,
    hemiSky: '#8a7a60', hemiGround: '#33261a', hemiIntensity: 0.55,
    rimColor: '#c88a5c', skyZenith: '#3a3548', skyMid: '#7a5f52', skyHorizon: '#b89878',
    mountainColor: '#4a3a30',
  },
  terrainAmp: 6.5, terrainBase: 0.5, waterRadius: 0, waterPos: [0, 0],
  groundColors: ['#6b5a3c', '#57482e'],
  treeDensity: 0.75, treeTint: ['#4a5a38', '#6a7a48'],
  minimapGround: [107, 90, 60],
  prevMap: 'dahuang-city', nextMap: 'tanggu', nextLabel: '汤谷',
  bossId: 'puppet', bossPos: [0, -30],
  minions: [
    { id: 'puppet', pos: [-14, -18] }, { id: 'puppet', pos: [14, -16] }, { id: 'puppet', pos: [0, -38] },
  ],
  decorate(built) {
    // 图腾柱阵 + 寨门
    for (const [tx, tz] of [[-6, 20], [6, 20], [-12, 8], [12, 8], [-4, -12], [4, -12]] as const) {
      built.group.add(buildTotemPole(tx, tz));
      built.addCollider({ x: tx, z: tz, r: 0.9 });
    }
    const gate = buildShopStall(0, 30, Math.PI, '#8a3b2e');
    built.group.add(gate.group);
    // 蚩尤立身位留空(NPC 由 Director 放置)
  },
};

/* ================= 第三章:汤谷 ================= */
const tangguSpec: ThemeSpec = {
  id: 'tanggu',
  name: '东海汤谷',
  epigraph: '十日并出,扶桑燎天',
  boundsRadius: 100,
  env: {
    fogColor: '#c8a878', fogDensity: 0.009,
    sunDir: [0.7, 0.55, -0.3], sunColor: '#ffd88a', sunIntensity: 3.0,
    hemiSky: '#d8b888', hemiGround: '#5a3a20', hemiIntensity: 0.7,
    rimColor: '#ffcf8a', skyZenith: '#5a5a78', skyMid: '#c89868', skyHorizon: '#f0d0a0',
    mountainColor: '#8a6a48',
  },
  terrainAmp: 4.5, terrainBase: 0.2, waterRadius: 22, waterPos: [0, -14],
  groundColors: ['#b09468', '#96805a'],
  treeDensity: 0.4, treeTint: ['#7a6a3a', '#9a8a4a'],
  minimapGround: [176, 148, 104],
  prevMap: 'jiuli-nanjiang', nextMap: 'shenlou-city', nextLabel: '蜃楼城',
  bossId: 'golden_crow', bossPos: [0, -30],
  minions: [],
  decorate(built) {
    const tree = buildFusangTree(0, -34);
    built.group.add(tree.group);
    for (const c of tree.colliders) built.addCollider(c);
    // 温泉栈道
    built.group.add(buildBoardwalk(-6, 6, 12, 0.5));
  },
};

/* ================= 第四章:蜃楼城 ================= */
const shenlouSpec: ThemeSpec = {
  id: 'shenlou-city',
  name: '蜃楼迷城',
  epigraph: '海市蜃楼,镜花水月',
  boundsRadius: 92,
  env: {
    fogColor: '#8fb5b0', fogDensity: 0.012,
    sunDir: [-0.4, 0.6, -0.5], sunColor: '#cfe8e0', sunIntensity: 2.0,
    hemiSky: '#a8c8c0', hemiGround: '#2a3a38', hemiIntensity: 0.6,
    rimColor: '#8fe0d0', skyZenith: '#2f4a55', skyMid: '#6f9a95', skyHorizon: '#b8d5cc',
    mountainColor: '#4a6a68',
  },
  terrainAmp: 2.2, terrainBase: 0.4, waterRadius: 26, waterPos: [0, 10],
  groundColors: ['#7a9a90', '#5f7f78'],
  treeDensity: 0.22, treeTint: ['#3f6f68', '#5f8f85'],
  minimapGround: [95, 154, 144],
  prevMap: 'tanggu', nextMap: 'kunlun', nextLabel: '昆仑',
  bossId: 'mirage_demon', bossPos: [0, -26],
  minions: [],
  decorate(built) {
    // 幻塔群(半透明,蜃楼感)
    for (const [tx, tz, h] of [[-12, -6, 14], [12, -4, 10], [-8, 8, 8], [10, 10, 12], [0, -14, 9]] as const) {
      built.group.add(buildMirageTower(tx, tz, h));
      built.addCollider({ x: tx, z: tz, r: 2.2 });
    }
  },
};

/* ================= 第五章:昆仑瑶池 ================= */
const kunlunSpec: ThemeSpec = {
  id: 'kunlun',
  name: '昆仑瑶池',
  epigraph: '雪岭瑶池,蟠桃盛会',
  boundsRadius: 98,
  env: {
    fogColor: '#c8d5e0', fogDensity: 0.010,
    sunDir: [0.5, 0.65, -0.4], sunColor: '#eef4ff', sunIntensity: 2.6,
    hemiSky: '#d8e4f0', hemiGround: '#4a5a6a', hemiIntensity: 0.75,
    rimColor: '#bcd8f0', skyZenith: '#4a6a8f', skyMid: '#8fa8c0', skyHorizon: '#dfe8f0',
    mountainColor: '#8fa5b8',
  },
  terrainAmp: 7.5, terrainBase: 1.0, waterRadius: 16, waterPos: [0, -8],
  groundColors: ['#c8d0d8', '#aab8c2'],
  treeDensity: 0.3, treeTint: ['#4a6a52', '#6a8a68'],
  minimapGround: [200, 208, 216],
  prevMap: 'shenlou-city', nextMap: 'youdu', nextLabel: '幽都',
  bossId: 'water_assassin', bossPos: [0, -24],
  minions: [],
  decorate(built) {
    built.group.add(buildJadePeaks(-24, -30));
    built.group.add(buildJadePeaks(28, -36));
  },
};

/* ================= 第六章:幽都鬼界 ================= */
const youduSpec: ThemeSpec = {
  id: 'youdu',
  name: '幽都鬼界',
  epigraph: '魂归幽都,鬼火引路',
  boundsRadius: 90,
  env: {
    fogColor: '#3a3048', fogDensity: 0.016,
    sunDir: [0.2, 0.4, -0.7], sunColor: '#8a78c8', sunIntensity: 1.4,
    hemiSky: '#5a4a78', hemiGround: '#1a1420', hemiIntensity: 0.5,
    rimColor: '#8a6ac8', skyZenith: '#17121f', skyMid: '#3a2f4a', skyHorizon: '#55446a',
    mountainColor: '#2a2233',
  },
  terrainAmp: 5.0, terrainBase: 0.0, waterRadius: 14, waterPos: [0, -12],
  groundColors: ['#3a3244', '#2c2636'],
  treeDensity: 0.35, treeTint: ['#2f2a3a', '#453c55'],
  minimapGround: [58, 50, 68],
  prevMap: 'kunlun', nextMap: 'shuize', nextLabel: '大荒水泽',
  bossId: 'ghost_king', bossPos: [0, -28],
  minions: [],
  decorate(built) {
    built.group.add(buildGhostGate(0, 16));
    built.group.add(buildGhostGate(-16, -6));
  },
};

/* ================= 第七章:大荒水泽 ================= */
const shuizeSpec: ThemeSpec = {
  id: 'shuize',
  name: '大荒水泽',
  epigraph: '九州始涝,蛇泽千里',
  boundsRadius: 104,
  env: {
    fogColor: '#8fa895', fogDensity: 0.010,
    sunDir: [0.4, 0.5, -0.55], sunColor: '#d8e8c8', sunIntensity: 2.2,
    hemiSky: '#a8c0a0', hemiGround: '#2a3a28', hemiIntensity: 0.6,
    rimColor: '#8fd2a0', skyZenith: '#3a5548', skyMid: '#6f8f78', skyHorizon: '#b0c8a8',
    mountainColor: '#3f5a45',
  },
  terrainAmp: 3.0, terrainBase: -0.4, waterRadius: 34, waterPos: [0, -6],
  groundColors: ['#5f7a52', '#4a6342'],
  treeDensity: 0.5, treeTint: ['#2f5a3f', '#4a7a52'],
  minimapGround: [95, 122, 82],
  prevMap: 'youdu', nextMap: 'buzhou', nextLabel: '不周山',
  bossId: 'xiangliu', bossPos: [0, -30],
  minions: [
    { id: 'yigui', pos: [-12, -12] }, { id: 'yigui', pos: [12, -10] },
  ],
  decorate(built) {
    built.group.add(buildBoardwalk(-4, 20, 16, 0.9));
    built.group.add(buildBoardwalk(6, 22, 14, -0.7));
  },
};

/* ================= 终章:不周山 ================= */
const buzhouSpec: ThemeSpec = {
  id: 'buzhou',
  name: '不周山',
  epigraph: '天柱倾斜,洪波将起',
  boundsRadius: 96,
  env: {
    fogColor: '#9a938a', fogDensity: 0.011,
    sunDir: [-0.5, 0.7, -0.4], sunColor: '#dfe8f0', sunIntensity: 2.4,
    hemiSky: '#b0b8c0', hemiGround: '#3a3630', hemiIntensity: 0.6,
    rimColor: '#9fd0ff', skyZenith: '#3a4050', skyMid: '#7a7f88', skyHorizon: '#c8c4b8',
    mountainColor: '#55524a',
  },
  terrainAmp: 8.5, terrainBase: 1.2, waterRadius: 0, waterPos: [0, 0],
  groundColors: ['#7a766c', '#5f5c54'],
  treeDensity: 0.15, treeTint: ['#4a5a48', '#5f7a58'],
  minimapGround: [122, 118, 108],
  prevMap: 'shuize', nextMap: undefined, nextLabel: undefined,
  bossId: 'gonggong', bossPos: [0, -30],
  minions: [
    { id: 'water_assassin', pos: [-10, -16] }, { id: 'water_assassin', pos: [10, -16] },
  ],
  decorate(built) {
    const pillar = buildBrokenPillar(-6, -40);
    built.group.add(pillar.group);
    for (const c of pillar.colliders) built.addCollider(c);
  },
};

export const CHAPTER_MAPS: MapDefinition[] = [
  {
    id: jiuliSpec.id, name: jiuliSpec.name, epigraph: jiuliSpec.epigraph,
    boundsRadius: jiuliSpec.boundsRadius, environment: jiuliSpec.env,
    spawns: baseSpawns(jiuliSpec.boundsRadius),
    build: () => buildThemeMap(jiuliSpec),
  },
  {
    id: tangguSpec.id, name: tangguSpec.name, epigraph: tangguSpec.epigraph,
    boundsRadius: tangguSpec.boundsRadius, environment: tangguSpec.env,
    spawns: baseSpawns(tangguSpec.boundsRadius),
    build: () => buildThemeMap(tangguSpec),
  },
  {
    id: shenlouSpec.id, name: shenlouSpec.name, epigraph: shenlouSpec.epigraph,
    boundsRadius: shenlouSpec.boundsRadius, environment: shenlouSpec.env,
    spawns: baseSpawns(shenlouSpec.boundsRadius),
    build: () => buildThemeMap(shenlouSpec),
  },
  {
    id: kunlunSpec.id, name: kunlunSpec.name, epigraph: kunlunSpec.epigraph,
    boundsRadius: kunlunSpec.boundsRadius, environment: kunlunSpec.env,
    spawns: baseSpawns(kunlunSpec.boundsRadius),
    build: () => buildThemeMap(kunlunSpec),
  },
  {
    id: youduSpec.id, name: youduSpec.name, epigraph: youduSpec.epigraph,
    boundsRadius: youduSpec.boundsRadius, environment: youduSpec.env,
    spawns: baseSpawns(youduSpec.boundsRadius),
    build: () => buildThemeMap(youduSpec),
  },
  {
    id: shuizeSpec.id, name: shuizeSpec.name, epigraph: shuizeSpec.epigraph,
    boundsRadius: shuizeSpec.boundsRadius, environment: shuizeSpec.env,
    spawns: baseSpawns(shuizeSpec.boundsRadius),
    build: () => buildThemeMap(shuizeSpec),
  },
  {
    id: buzhouSpec.id, name: buzhouSpec.name, epigraph: buzhouSpec.epigraph,
    boundsRadius: buzhouSpec.boundsRadius, environment: buzhouSpec.env,
    spawns: baseSpawns(buzhouSpec.boundsRadius),
    build: () => buildThemeMap(buzhouSpec),
  },
];

/** 大荒城新增:南征门(→九黎) */
export function addCityFrontierGate(built: BuiltMap): void {
  const pad = buildTeleporterPad();
  pad.group.position.set(30, built.heightAt(30, -6) + 0.1, -6);
  built.group.add(pad.group);
  built.teleporters.push({
    id: 'to-jiuli',
    pos: new THREE.Vector2(30, -6),
    radius: 2.0,
    targetMapId: 'jiuli-nanjiang',
    targetSpawnId: 'entry',
    label: '九黎南疆',
    group: pad.group,
    update: () => {},
  });
  void bakeMinimap;
}
