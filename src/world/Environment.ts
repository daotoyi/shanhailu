import * as THREE from 'three';
import { SilhouetteRing } from '../render/Silhouettes.js';
import { SkyDome } from '../render/SkyDome.js';
import type { MapEnvironment } from './maps/types.js';

/**
 * 场景环境(常驻,切图只换参数):渐变天空穹顶 + 远山剪影 + FogExp2 + 三灯预设。
 * 质量管理器绑定的主光引用保持稳定,阴影参数跨图复用。
 */
export class WorldEnvironment {
  readonly scene = new THREE.Scene();
  readonly sunLight: THREE.DirectionalLight;
  private readonly hemi: THREE.HemisphereLight;
  private readonly rim: THREE.DirectionalLight;
  private sky: SkyDome;
  private silhouettes: SilhouetteRing;
  private fog: THREE.FogExp2;
  private currentEnv: MapEnvironment | null = null;

  constructor() {
    const defaultSun: [number, number, number] = [0.55, 0.62, -0.55];
    this.sky = new SkyDome(new THREE.Vector3(...defaultSun));
    this.silhouettes = new SilhouetteRing(new THREE.Color('#c3bda4'));
    this.fog = new THREE.FogExp2('#9aa893', 0.0095);

    this.hemi = new THREE.HemisphereLight('#a8c4b2', '#4a3b2a', 0.65);
    this.sunLight = new THREE.DirectionalLight('#ffe0b0', 2.6);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 20;
    this.sunLight.shadow.camera.far = 260;
    const ext = 70;
    this.sunLight.shadow.camera.left = -ext;
    this.sunLight.shadow.camera.right = ext;
    this.sunLight.shadow.camera.top = ext;
    this.sunLight.shadow.camera.bottom = -ext;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.02;
    this.rim = new THREE.DirectionalLight('#7fb8c8', 0.9);
    this.rim.position.set(-40, 26, 55);

    this.scene.add(this.sky.mesh, this.silhouettes.group, this.hemi, this.sunLight, this.sunLight.target, this.rim);
    this.scene.background = new THREE.Color('#9aa893');
    // 场景雾对象挂到 scene(自定义 shader 经 fog chunk 拾取)
    this.scene.fog = this.fog;
  }

  /** 应用地图环境预设 */
  apply(env: MapEnvironment): void {
    if (this.currentEnv && JSON.stringify(this.currentEnv) === JSON.stringify(env)) return;
    this.currentEnv = env;

    const sunDir = new THREE.Vector3(...env.sunDir).normalize();
    // 天空/远山:重建(着色器 uniform 少,重建成本低)
    this.scene.remove(this.sky.mesh, this.silhouettes.group);
    this.sky = new SkyDome(sunDir);
    this.silhouettes = new SilhouetteRing(new THREE.Color(env.skyHorizon));
    // 换远山基色
    this.silhouettes.setMountainColor(new THREE.Color(env.mountainColor));
    this.scene.add(this.sky.mesh, this.silhouettes.group);

    this.fog.color.set(env.fogColor);
    this.fog.density = env.fogDensity;
    (this.scene.background as THREE.Color).set(env.fogColor).multiplyScalar(0.9);

    this.hemi.color.set(env.hemiSky);
    this.hemi.groundColor.set(env.hemiGround);
    this.hemi.intensity = env.hemiIntensity;
    this.sunLight.color.set(env.sunColor);
    this.sunLight.intensity = env.sunIntensity;
    this.sunLight.position.copy(sunDir).multiplyScalar(90);
    this.rim.color.set(env.rimColor);
  }

  update(elapsed: number): void {
    // 神祠/水等属于地图;环境层无逐帧动画(天空太阳静止)
    void elapsed;
  }
}
