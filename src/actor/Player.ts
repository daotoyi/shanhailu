import * as THREE from 'three';
import type { CharacterRig, RigAnimState } from './CharacterRig.js';
import { createCharacterRig } from './CharacterRig.js';
import type { InputManager } from '../core/Input/InputManager.js';
import { PALETTES, DEFAULT_PALETTE_ID } from '../data/character-palettes.js';

/** 玩家运动参数(数据内联,M5 数值化后迁入 data) */
const MOVE_SPEED = 5.6;
const TURN_SPEED = 12;

/**
 * 玩家控制器:语义输入 → 相机系移动 → 地形贴合 → Rig 动画状态驱动。
 * 相机 yaw 由 FollowCamera 提供(ARPG 标准:相机控向,角色朝移动方向)。
 */
export class Player {
  readonly rig: CharacterRig;
  readonly position = new THREE.Vector3();
  /** 面朝向(弧度) */
  heading = 0;
  /** 当前移动速度(标量,动画混合用) */
  private speedNorm = 0;
  private animOverride: RigAnimState | null = null;
  private overrideT = 0;

  constructor(
    private readonly input: InputManager,
    private readonly heightAt: (x: number, z: number) => number,
    spawn: THREE.Vector3,
  ) {
    this.rig = createCharacterRig(PALETTES[DEFAULT_PALETTE_ID]!);
    this.position.copy(spawn);
    this.rig.root.position.copy(spawn);
  }

  /** 播放一次性动作(攻击/施法/翻滚),结束后自动回落 */
  playOverride(state: Exclude<RigAnimState, 'idle' | 'run'>, duration: number): void {
    this.animOverride = state;
    this.overrideT = duration;
  }

  get isOverriding(): boolean {
    return this.animOverride !== null;
  }

  update(dt: number, elapsed: number, camYaw: number, frozen = false): void {
    // 输入 → 相机系移动向量(对话/过场/菜单时冻结移动,动画回落 idle)
    const mv = frozen ? { x: 0, z: 0 } : this.input.moveVector();
    const mag = Math.hypot(mv.x, mv.z);

    if (mag > 0.05) {
      // 相机系 → 世界系:相机前向(水平) = (-sin yaw, -cos yaw),右向 = (cos yaw, -sin yaw)
      const sin = Math.sin(camYaw);
      const cos = Math.cos(camYaw);
      const dirX = mv.x * cos - mv.z * sin;
      const dirZ = -mv.x * sin - mv.z * cos;
      const len = Math.max(1, Math.hypot(dirX, dirZ));
      const vx = (dirX / len) * MOVE_SPEED * Math.min(1, mag);
      const vz = (dirZ / len) * MOVE_SPEED * Math.min(1, mag);
      this.position.x += vx * dt;
      this.position.z += vz * dt;
      // 平滑转向(最短路径)
      const targetHeading = Math.atan2(dirX, dirZ);
      let delta = targetHeading - this.heading;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      this.heading += delta * Math.min(1, dt * TURN_SPEED);
      this.speedNorm += (Math.min(1, mag) - this.speedNorm) * Math.min(1, dt * 10);
    } else {
      this.speedNorm += (0 - this.speedNorm) * Math.min(1, dt * 12);
    }

    // 地形贴合
    this.position.y = this.heightAt(this.position.x, this.position.z);
    this.rig.root.position.copy(this.position);
    this.rig.root.rotation.y = this.heading;

    // 动画状态
    let state: RigAnimState = this.speedNorm > 0.08 ? 'run' : 'idle';
    if (this.animOverride) {
      this.overrideT -= dt;
      state = this.animOverride;
      if (this.overrideT <= 0) this.animOverride = null;
    }
    this.rig.animate(state, elapsed, dt, this.speedNorm);
  }
}
