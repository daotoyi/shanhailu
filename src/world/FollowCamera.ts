import * as THREE from 'three';
import type { InputManager } from '../core/Input/InputManager.js';

/**
 * 第三人称跟随相机(ARPG 标准):输入控制 yaw/pitch,玩家朝移动方向。
 * 平滑跟随 + 地形避让(相机不入地)。
 */

const BASE_DIST = 5.4;
const MIN_PITCH = -0.25;
const MAX_PITCH = 1.15;

export class FollowCamera {
  yaw = 0;
  pitch = 0.32;
  dist = BASE_DIST;
  private readonly target = new THREE.Vector3();
  private shake = 0;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly input: InputManager,
    private readonly heightAt: (x: number, z: number) => number,
  ) {}

  /** 受击/大招震屏(PROMPT §3.5 镜头微震):trauma 0~1 */
  addShake(amount: number): void {
    this.shake = Math.min(1, this.shake + amount);
  }

  /** 立即对准目标(传送/读档) */
  snapTo(pos: THREE.Vector3): void {
    this.target.copy(pos).add(new THREE.Vector3(0, 1.55, 0));
    const dir = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    this.camera.position.copy(this.target).addScaledVector(dir, this.dist);
    this.camera.lookAt(this.target);
  }

  update(dt: number, playerPos: THREE.Vector3): void {
    // 视角输入(鼠标 + 触屏统一)
    const look = this.input.consumeLook();
    const sens = 0.0032;
    this.yaw -= look.dx * sens;
    this.pitch += look.dy * sens;
    this.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, this.pitch));
    const zoom = this.input.consumeZoom();
    this.dist = Math.max(3.2, Math.min(9, this.dist * (zoom > 0 ? 0.92 : zoom < 0 ? 1.08 : 1)));

    // 目标点:玩家头部
    this.target.lerp(
      _v1.copy(playerPos).add(_v2.set(0, 1.55, 0)),
      Math.min(1, dt * 10),
    );

    // 期望机位(目标后方)
    const dir = _v1.set(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    const desired = _v2.copy(this.target).addScaledVector(dir, this.dist);
    // 地形避让:不低于地面 0.45
    const ground = this.heightAt(desired.x, desired.z) + 0.45;
    if (desired.y < ground) desired.y = ground;
    // 平滑
    this.camera.position.lerp(desired, Math.min(1, dt * 9));

    // 震屏衰减 + 噪声偏移
    let sx = 0;
    let sy = 0;
    if (this.shake > 0.001) {
      const t = performance.now() * 0.001;
      sx = (Math.sin(t * 57) + Math.sin(t * 31) * 0.6) * 0.5 * this.shake * 0.22;
      sy = (Math.cos(t * 47) + Math.cos(t * 23) * 0.6) * 0.5 * this.shake * 0.22;
      this.shake *= Math.exp(-dt * 5.5);
    }
    this.camera.lookAt(this.target.x + sx, this.target.y + sy, this.target.z);

    void dt;
  }

  get currentYaw(): number {
    return this.yaw;
  }
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
