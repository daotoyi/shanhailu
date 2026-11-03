import * as THREE from 'three';

/** 可采集草药(发光小植株,靠近 E 采集) */
export class CollectibleHerb {
  readonly group = new THREE.Group();
  readonly pos: THREE.Vector3;

  constructor(
    readonly id: string,
    readonly herbId: string,
    x: number,
    z: number,
    heightAt: (x: number, z: number) => number,
  ) {
    this.pos = new THREE.Vector3(x, heightAt(x, z), z);
    const stemMat = new THREE.MeshStandardMaterial({ color: '#4a7a55', flatShading: true, roughness: 0.9 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: '#9fe8b8',
      emissive: '#5fd2a0',
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.85,
    });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.34, 5), stemMat);
    stem.position.y = 0.17;
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), stemMat);
    leaves.position.y = 0.36;
    leaves.scale.y = 1.6;
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), glowMat);
    halo.position.y = 0.36;
    this.group.add(stem, leaves, halo);
    this.group.position.copy(this.pos);
  }

  update(elapsed: number): void {
    this.group.rotation.y = elapsed * 0.8;
    this.group.position.y = this.pos.y + Math.sin(elapsed * 2 + this.pos.x) * 0.04;
  }

  get picked(): boolean {
    return !this.group.visible;
  }

  pick(): void {
    this.group.visible = false;
  }
}
