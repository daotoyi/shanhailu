import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/** 暗角 + 轻微边缘暖褐滤镜(线性 HDR 阶段) */
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uStrength: { value: 0.38 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uStrength;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float d = length(vUv - 0.5);
      float vig = smoothstep(0.52, 0.95, d);
      color.rgb *= 1.0 - vig * uStrength;
      // 边缘轻微染入墨褐色,收拢画面
      color.rgb = mix(color.rgb, color.rgb * vec3(1.0, 0.96, 0.9), vig * 0.6);
      gl_FragColor = color;
    }
  `,
};

/**
 * 后处理链:Render → Bloom(克制) → 暗角 → OutputPass(色调映射+sRGB)。
 * 渲染器 toneMapping 设为 ACESFilmic,r152+ 管线在 OutputPass 统一执行。
 */
export class PostFX {
  readonly composer: EffectComposer;
  private readonly bloomPass: UnrealBloomPass;
  private readonly vignettePass: ShaderPass;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    width: number,
    height: number,
  ) {
    const target = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      samples: 4,
    });
    this.composer = new EffectComposer(renderer, target);
    this.composer.setSize(width, height);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.42, 0.55, 0.82);
    this.composer.addPass(this.bloomPass);
    this.vignettePass = new ShaderPass(VignetteShader);
    this.composer.addPass(this.vignettePass);
    this.composer.addPass(new OutputPass());
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }

  setBloomEnabled(on: boolean): void {
    this.bloomPass.enabled = on;
  }

  setVignetteEnabled(on: boolean): void {
    this.vignettePass.enabled = on;
  }

  render(dt: number): void {
    this.composer.render(dt);
  }
}
