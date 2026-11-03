import * as THREE from 'three';

export interface WaterOptions {
  radius: number;
  position: THREE.Vector3;
  sunDir: THREE.Vector3;
  /** 雾色(用于远水融入) */
  fogColor: THREE.Color;
}

/**
 * 风格化水面:多向正弦波位移 + 解析法线 + 细波纹,
 * 菲涅尔混天空色、太阳高光、径向近岸渐变(深→浅 + 透明度渐变),接入场景雾。
 */
export class Water {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor(opts: WaterOptions) {
    const geometry = new THREE.CircleGeometry(opts.radius, 72, 1);
    geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uDeepColor: { value: new THREE.Color('#155048') },
          uShallowColor: { value: new THREE.Color('#3f7a62') },
          uSkyColor: { value: new THREE.Color('#8fb5a4') },
          uSunColor: { value: new THREE.Color('#ffd9a0') },
          uSunDir: { value: opts.sunDir.clone().normalize() },
          uFogColor: { value: opts.fogColor.clone() },
        },
      ]),
      vertexShader: /* glsl */ `
        #include <fog_pars_vertex>
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec2 vUv;

        float waveH(vec2 p, float t) {
          return sin(p.x * 0.35 + t * 0.9) * 0.13
               + sin(p.y * 0.28 - t * 0.7) * 0.11
               + sin((p.x + p.y) * 0.16 + t * 0.5) * 0.16;
        }

        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          wp.y += waveH(wp.xz, uTime);
          vWorldPos = wp.xyz;
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        #include <fog_pars_fragment>
        uniform float uTime;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uSkyColor;
        uniform vec3 uSunColor;
        uniform vec3 uSunDir;
        varying vec3 vWorldPos;
        varying vec2 vUv;

        vec3 waterNormal(vec2 p, float t) {
          float dhdx = 0.35 * cos(p.x * 0.35 + t * 0.9) * 0.13
                     + 0.16 * cos((p.x + p.y) * 0.16 + t * 0.5) * 0.16;
          float dhdz = 0.28 * cos(p.y * 0.28 - t * 0.7) * 0.11
                     + 0.16 * cos((p.x + p.y) * 0.16 + t * 0.5) * 0.16;
          // 细波纹(高频法线扰动,无位移)
          dhdx += sin(p.y * 2.3 - t * 1.4) * sin(p.x * 1.9 + t * 1.1) * 0.025;
          dhdz += sin(p.x * 2.7 + t * 1.6) * sin(p.y * 2.1 - t * 1.2) * 0.025;
          return normalize(vec3(-dhdx, 1.0, -dhdz));
        }

        void main() {
          vec3 N = waterNormal(vWorldPos.xz, uTime);
          vec3 V = normalize(cameraPosition - vWorldPos);
          float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          float radial = length(vUv - 0.5) * 2.0;
          float shore = smoothstep(0.62, 1.0, radial);
          vec3 base = mix(uDeepColor, uShallowColor, shore);
          vec3 col = mix(base, uSkyColor, fres * 0.38);
          vec3 H = normalize(normalize(uSunDir) + V);
          float spec = pow(max(dot(N, H), 0.0), 160.0);
          col += uSunColor * spec * 1.4;
          float alpha = mix(0.94, 0.68, shore);
          gl_FragColor = vec4(col, alpha);
          #include <fog_fragment>
        }
      `,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.copy(opts.position);
    this.mesh.renderOrder = 1;
  }

  update(elapsed: number): void {
    (this.material.uniforms['uTime'] as THREE.IUniform).value = elapsed;
  }
}
