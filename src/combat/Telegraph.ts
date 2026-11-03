import * as THREE from 'three';

/**
 * 范围预警圈(PROMPT §3.5 Boss):地面扩散圆环,读条结束后判定。
 * 由 Enemy 攻击流程创建/回收;shader 免了,用双 Mesh(环扩散+内盘淡入)。
 */
export class TelegraphRing {
  private readonly group = new THREE.Group();
  private readonly ring: THREE.Mesh;
  private readonly disc: THREE.Mesh;
  private radius = 3;
  private duration = 0.9;
  private t = 0;
  private active = false;

  constructor(scene: THREE.Scene) {
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.86, 1.0, 40),
      new THREE.MeshBasicMaterial({ color: '#c04a5a', transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.0, 32),
      new THREE.MeshBasicMaterial({ color: '#e05a5a', transparent: true, opacity: 0.16, depthWrite: false }),
    );
    this.ring.rotation.x = this.disc.rotation.x = -Math.PI / 2;
    this.ring.renderOrder = this.disc.renderOrder = 3;
    this.group.add(this.ring, this.disc);
    this.group.visible = false;
    scene.add(this.group);
  }

  /** 在地面某点播放半径 radius 的预警,duration 秒 */
  play(pos: THREE.Vector3, radius: number, duration: number): void {
    this.group.position.copy(pos);
    this.group.position.y += 0.06;
    this.radius = radius;
    this.duration = duration;
    this.t = 0;
    this.active = true;
    this.group.visible = true;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.t += dt;
    const p = Math.min(1, this.t / this.duration);
    this.ring.scale.setScalar(0.2 + p * this.radius);
    this.disc.scale.set(this.radius, this.radius, 1);
    (this.disc.material as THREE.MeshBasicMaterial).opacity = 0.1 + p * 0.28;
    if (p >= 1) {
      this.active = false;
      this.group.visible = false;
    }
  }
}
