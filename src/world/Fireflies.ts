import * as THREE from 'three';
import { mulberry32 } from '../core/Noise.js';

/**
 * 萤火/浮尘粒子:加法混合 Points,顶点着色器内正弦漂移 + 闪烁。
 * 数量受画质预算约束,M0 固定 90 只。
 */
export class Fireflies {
  readonly points: THREE.Points;
  private readonly material: THREE.ShaderMaterial;

  constructor(anchors: THREE.Vector3[]) {
    const COUNT = 90;
    const rng = mulberry32(20250001);
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const anchor = anchors[i % anchors.length]!;
      positions[i * 3] = anchor.x + (rng() - 0.5) * 16;
      positions[i * 3 + 1] = anchor.y + 0.8 + rng() * 3.4;
      positions[i * 3 + 2] = anchor.z + (rng() - 0.5) * 16;
      seeds[i] = rng() * Math.PI * 2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        uniform float uTime;
        attribute float aSeed;
        varying float vTwinkle;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * 0.6 + aSeed * 3.1) * 1.4;
          p.y += sin(uTime * 0.45 + aSeed * 5.7) * 0.9;
          p.z += cos(uTime * 0.5 + aSeed * 2.3) * 1.4;
          vTwinkle = 0.55 + 0.45 * sin(uTime * (2.0 + fract(aSeed) * 2.0) + aSeed * 7.0);
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (90.0 / -mvPosition.z) * (0.6 + 0.4 * fract(aSeed * 1.7));
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vTwinkle;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float falloff = smoothstep(0.5, 0.05, length(d));
          vec3 col = vec3(1.0, 0.85, 0.5) * falloff * vTwinkle;
          gl_FragColor = vec4(col, falloff * vTwinkle);
        }
      `,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  update(elapsed: number): void {
    (this.material.uniforms['uTime'] as THREE.IUniform).value = elapsed;
  }
}
