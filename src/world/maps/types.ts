import * as THREE from 'three';

/** 地图环境预设(天空/雾/灯光,每图一套,切换即时应用) */
export interface MapEnvironment {
  fogColor: string;
  fogDensity: number;
  sunDir: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  rimColor: string;
  skyZenith: string;
  skyMid: string;
  skyHorizon: string;
  /** 远山剪影基色 */
  mountainColor: string;
}

export interface MapCollider {
  x: number;
  z: number;
  r: number;
}

/** 传送阵(构建期产出,世界坐标) */
export interface BuiltTeleporter {
  id: string;
  pos: THREE.Vector2;
  radius: number;
  targetMapId: string;
  targetSpawnId: string;
  label: string;
  group: THREE.Group;
  update(elapsed: number): void;
}

export interface MapSpawnPoint {
  id: string;
  pos: [number, number];
  heading: number;
}

export interface BuiltMap {
  group: THREE.Group;
  heightAt(x: number, z: number): number;
  colliders: MapCollider[];
  teleporters: BuiltTeleporter[];
  update(elapsed: number): void;
  /** 释放几何/材质(切图卸载) */
  dispose(): void;
  /** 小地图底图(RGBA 像素,size×size,构建期烘焙;UI 层负责上屏)与采样半径 */
  minimap: { pixels: Uint8ClampedArray; size: number; worldRadius: number };
}

export interface MapDefinition {
  id: string;
  name: string;
  /** 加载过场显示的一句题记 */
  epigraph: string;
  boundsRadius: number;
  environment: MapEnvironment;
  spawns: MapSpawnPoint[];
  build(): BuiltMap;
}
