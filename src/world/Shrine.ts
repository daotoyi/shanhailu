import * as THREE from 'three';

/**
 * 神祠 —— 山谷记忆点(PROMPT §2.4 神祠原型:M2 接入存档/传送功能,M0 为视觉地标)。
 * 石台 + 朱柱 + 双层攒尖顶 + 供灯(Bloom 拾取的暖光点)。
 */
export class Shrine {
  readonly group = new THREE.Group();
  private readonly lampMats: THREE.MeshStandardMaterial[] = [];

  constructor() {
    const stone = new THREE.MeshStandardMaterial({ color: '#8b8a80', flatShading: true, roughness: 0.9 });
    const wood = new THREE.MeshStandardMaterial({ color: '#8f3d2e', flatShading: true, roughness: 0.8 });
    const woodDark = new THREE.MeshStandardMaterial({ color: '#5a2c22', flatShading: true, roughness: 0.85 });
    const tile = new THREE.MeshStandardMaterial({ color: '#37545c', flatShading: true, roughness: 0.7, metalness: 0.15 });
    const gold = new THREE.MeshStandardMaterial({ color: '#c9a25c', flatShading: true, roughness: 0.35, metalness: 0.6 });
    const lamp = new THREE.MeshStandardMaterial({ color: '#ffb45e', emissive: '#ff9a3c', emissiveIntensity: 2.4 });
    this.lampMats.push(lamp);

    /* 石台三层 */
    const steps: [number, number, number][] = [
      [4.6, 0.42, 0],
      [3.9, 0.38, 0.42],
      [3.2, 0.36, 0.8],
    ];
    for (const [r, h, y] of steps) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.18, h, 8), stone);
      m.position.y = y + h / 2;
      m.castShadow = m.receiveShadow = true;
      this.group.add(m);
    }

    /* 朱柱四根 + 台面 */
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, 0.18, 8), woodDark);
    floor.position.y = 1.06;
    floor.receiveShadow = true;
    this.group.add(floor);
    for (const [px, pz] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]] as const) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 2.7, 8), wood);
      pillar.position.set(px, 2.4, pz);
      pillar.castShadow = true;
      this.group.add(pillar);
      // 柱头金箍
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 6, 12), gold);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(px, 3.55, pz);
      this.group.add(ring);
    }

    /* 双层攒尖顶 */
    const roofLower = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.5, 4), tile);
    roofLower.rotation.y = Math.PI / 4;
    roofLower.position.y = 4.4;
    roofLower.castShadow = true;
    const roofUpper = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.7, 4), tile);
    roofUpper.rotation.y = Math.PI / 4;
    roofUpper.position.y = 5.7;
    roofUpper.castShadow = true;
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), gold);
    finial.position.y = 6.75;
    this.group.add(roofLower, roofUpper, finial);

    /* 供案与供灯(发光点) */
    const altar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 0.7), woodDark);
    altar.position.set(0, 1.55, -1.1);
    altar.castShadow = true;
    const lampMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), lamp);
    lampMesh.position.set(0, 2.35, -1.1);
    this.group.add(altar, lampMesh);

    /* 香炉双灯柱(入口) */
    for (const sx of [-2.6, 2.6]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.5, 6), stone);
      post.position.set(sx, 1.9, 3.1);
      post.castShadow = true;
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.18, 0.3, 6), stone);
      bowl.position.set(sx, 2.75, 3.1);
      const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), lamp);
      flame.position.set(sx, 3.0, 3.1);
      this.group.add(post, bowl, flame);
    }

    this.group.position.set(0, 0, -30);
  }

  /** 供灯呼吸脉动 */
  update(elapsed: number): void {
    const pulse = 2.2 + Math.sin(elapsed * 2.4) * 0.55;
    for (const m of this.lampMats) m.emissiveIntensity = pulse;
  }
}
