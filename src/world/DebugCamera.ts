import * as THREE from 'three';
import type { InputManager } from '../core/Input/InputManager.js';
import { pal } from '../core/PAL/index.js';

/**
 * M0 飞行调试相机:WASD 平移 + Q/C 升降 + 右键拖拽/指针锁定转视角 + 滚轮调速。
 * M1 将替换为跟随相机;键位表见 data/input-bindings.ts。
 */
export class DebugCamera {
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');
  speed = 12;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly input: InputManager,
  ) {
    this.euler.setFromQuaternion(camera.quaternion, 'YXZ');
  }

  update(dt: number): void {
    const look = this.input.consumeLook();
    const sens = 0.0026;
    this.euler.y -= look.dx * sens;
    this.euler.x -= look.dy * sens;
    this.euler.x = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, this.euler.x));
    this.camera.quaternion.setFromEuler(this.euler);

    const move = this.input.moveVector();
    const up = (this.input.isDown('camUp') ? 1 : 0) - (this.input.isDown('camDown') ? 1 : 0);
    if (this.input.consumePressed('sprint')) this.speed = this.speed >= 12 ? 30 : 12;

    const speed = this.speed * dt;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    this.camera.position.addScaledVector(forward, move.z * speed);
    this.camera.position.addScaledVector(right, move.x * speed);
    this.camera.position.y += up * speed * 0.8;

    const zoom = this.input.consumeZoom();
    if (zoom !== 0) this.speed = Math.max(3, Math.min(60, this.speed * (zoom > 0 ? 0.9 : 1.1)));

    // 点击画布进入指针锁定(右键拖拽为备选)
    if (this.input.consumePressed('interact')) {
      pal().input.requestPointerLock();
    }
  }
}
