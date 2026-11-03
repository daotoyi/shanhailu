import * as THREE from 'three';
import { SilhouetteRing } from '../render/Silhouettes.js';
import { SkyDome } from '../render/SkyDome.js';
import { Water } from '../render/Water.js';
import { WATER_LEVEL, Terrain } from './Terrain.js';
import { Vegetation } from './Vegetation.js';
import { Shrine } from './Shrine.js';
import { Fireflies } from './Fireflies.js';

export const FOG_COLOR = new THREE.Color('#9aa893');

/**
 * M0 山谷 Demo 场景:天空/远山/雾/灯光/地形/水面/植被/神祠/萤火。
 * 场景氛围基准(PROMPT §4.3):ACES + Bloom + FogExp2 + 暗角 + 轮廓光 + 记忆点。
 */
export class DemoValley {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly sunLight: THREE.DirectionalLight;
  /** 出生点(贴地,出生整平区) */
  readonly spawnPoint = new THREE.Vector3(0, 3.0, -16);

  private readonly water: Water;
  private readonly shrine = new Shrine();
  private readonly fireflies: Fireflies;
  private readonly sky: SkyDome;
  private readonly terrain: Terrain;

  constructor() {
    this.scene.fog = new THREE.FogExp2(FOG_COLOR, 0.0095);
    this.scene.background = FOG_COLOR.clone().multiplyScalar(0.9);

    const sunDir = new THREE.Vector3(0.55, 0.62, -0.55).normalize();
    this.sky = new SkyDome(sunDir);
    this.scene.add(this.sky.mesh);
    this.scene.add(new SilhouetteRing(new THREE.Color('#c3bda4')).group);

    /* 相机:开场机位 —— 框住神祠(记忆点)与池塘 */
    this.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.5, 1200);
    this.camera.position.set(15, 6.4, -43);
    this.camera.lookAt(0, 2.4, -20);

    /* 灯光预设:半球环境 + 暖主光(投影)+ 冷色轮廓光 */
    const hemi = new THREE.HemisphereLight('#a8c4b2', '#4a3b2a', 0.65);
    this.scene.add(hemi);

    this.sunLight = new THREE.DirectionalLight('#ffe0b0', 2.6);
    this.sunLight.position.copy(sunDir).multiplyScalar(90);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 20;
    this.sunLight.shadow.camera.far = 220;
    const shadowExtent = 70;
    this.sunLight.shadow.camera.left = -shadowExtent;
    this.sunLight.shadow.camera.right = shadowExtent;
    this.sunLight.shadow.camera.top = shadowExtent;
    this.sunLight.shadow.camera.bottom = -shadowExtent;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const rim = new THREE.DirectionalLight('#7fb8c8', 0.9);
    rim.position.set(-40, 26, 55);
    this.scene.add(rim);

    /* 地形 + 水面 */
    this.terrain = new Terrain();
    this.scene.add(this.terrain.mesh);
    this.water = new Water({
      radius: 15.2,
      position: new THREE.Vector3(0, WATER_LEVEL, 8),
      sunDir,
      fogColor: FOG_COLOR,
    });
    this.scene.add(this.water.mesh);

    /* 植被(避让神祠与出生点) */
    const veg = new Vegetation(this.terrain, [
      { x: 0, z: -30, radius: 8 },
      { x: 0, z: -16, radius: 5 },
    ]);
    this.scene.add(veg.group);

    /* 神祠 + 萤火 */
    this.scene.add(this.shrine.group);
    this.fireflies = new Fireflies([
      new THREE.Vector3(0, 0, 8),
      new THREE.Vector3(0, 0, -30),
      new THREE.Vector3(-10, 0, -4),
      new THREE.Vector3(12, 0, -2),
    ]);
    this.scene.add(this.fireflies.points);
  }

  update(dt: number, elapsed: number): void {
    this.water.update(elapsed);
    this.shrine.update(elapsed);
    this.fireflies.update(elapsed);
    void dt;
  }

  /** 相机对齐天空太阳方向(供后处理与天空共享) */
  get sunDirection(): THREE.Vector3 {
    return this.sunLight.position.clone().normalize();
  }
}
