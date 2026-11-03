import * as THREE from 'three';

/**
 * 渐变天空穹顶:天顶青碧 → 地平雾白,太阳盘 + 光晕。
 * 半径 500,世界原点为中心(相机活动范围 ±130,视差可忽略)。
 */
export class SkyDome {
  readonly mesh: THREE.Mesh;

  constructor(sunDir: THREE.Vector3) {
    const uniforms = {
      uZenith: { value: new THREE.Color('#274b52') },
      uMid: { value: new THREE.Color('#5d7f78') },
      uHorizon: { value: new THREE.Color('#c3bda4') },
      uSunColor: { value: new THREE.Color('#ffd9a0') },
      uSunDir: { value: sunDir.clone().normalize() },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uZenith;
        uniform vec3 uMid;
        uniform vec3 uHorizon;
        uniform vec3 uSunColor;
        uniform vec3 uSunDir;
        varying vec3 vDir;

        void main() {
          vec3 dir = normalize(vDir);
          float h = dir.y;
          vec3 col;
          if (h >= 0.0) {
            col = mix(uHorizon, uMid, smoothstep(0.0, 0.28, h));
            col = mix(col, uZenith, smoothstep(0.22, 0.85, h));
          } else {
            // 地平线以下:雾色压暗,接住远山与地形
            col = mix(uHorizon, uHorizon * 0.55, smoothstep(0.0, -0.4, h));
          }
          float sd = max(dot(dir, normalize(uSunDir)), 0.0);
          float disc = smoothstep(0.9993, 0.9997, sd);
          float glow = pow(sd, 10.0) * 0.35 + pow(sd, 90.0) * 0.45;
          col += uSunColor * (disc * 3.0 + glow);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 32), material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
  }
}
