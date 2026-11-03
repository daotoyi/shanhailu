import * as THREE from 'three';
import * as THREE_NS from 'three';

/**
 * 触发器组:区域触发(进入半径)/交互点(靠近+E)/潜行区(视线锥躲避)。
 * 由 ScenarioDirector 按剧情动态装配,随地图切换重建。
 */

export interface ZoneTrigger {
  id: string;
  pos: THREE.Vector2;
  radius: number;
  once?: boolean;
  onEnter: () => void;
  fired?: boolean;
}

export interface Interactable {
  id: string;
  pos: THREE.Vector3;
  radius: number;
  prompt: string;
  /** 按 E 触发;返回 true 表示已消费 */
  onInteract: () => boolean;
  enabled?: () => boolean;
}

/** 巡逻者(潜行玩法):沿路径往返,视线锥 */
export interface Patroller {
  group: THREE.Group;
  path: THREE.Vector3[];
  speed: number;
  visionDist: number;
  visionAngle: number; // 全角/2(弧度)
  legPhase: number;
}

export class TriggerSystem {
  private zones: ZoneTrigger[] = [];
  private interactables: Interactable[] = [];
  private patrollers: Patroller[] = [];
  /** 潜行失败回调(重置) */
  onStealthFail: (() => void) | null = null;

  clear(scene: THREE.Scene): void {
    for (const p of this.patrollers) scene.remove(p.group);
    this.zones = [];
    this.interactables = [];
    this.patrollers = [];
    this.onStealthFail = null;
  }

  addZone(zone: ZoneTrigger): void {
    this.zones.push(zone);
  }

  addInteractable(i: Interactable): void {
    this.interactables.push(i);
  }

  addPatroller(scene: THREE.Scene, p: Patroller): void {
    scene.add(p.group);
    this.patrollers.push(p);
  }

  /** 信标柱(目标点可视化) */
  makeMarker(pos: THREE.Vector3, color = '#c9a25c'): THREE.Group {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.35, 12, 6, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, depthWrite: false, side: THREE_NS.DoubleSide }),
    );
    beam.position.y = 6;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.05, 6, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.1;
    g.add(beam, ring);
    g.position.copy(pos);
    return g;
  }

  /** 每帧:dt/elapsed/玩家位置/是否按下交互键 */
  update(
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    interactPressed: boolean,
    scene: THREE.Scene,
  ): Interactable | null {
    let promptHit: Interactable | null = null;

    for (const z of this.zones) {
      if (z.once && z.fired) continue;
      if (Math.hypot(playerPos.x - z.pos.x, playerPos.z - z.pos.y) < z.radius) {
        z.fired = true;
        z.onEnter();
      }
    }

    for (const i of this.interactables) {
      if (i.enabled && !i.enabled()) continue;
      if (Math.hypot(playerPos.x - i.pos.x, playerPos.z - i.pos.z) < i.radius) {
        promptHit = i;
        if (interactPressed && i.onInteract()) break;
      }
    }

    // 巡逻者移动 + 视线检测
    for (const p of this.patrollers) {
      if (p.path.length >= 2) {
        // 找当前段(基于时间往返)
        const total = p.path.length - 1;
        const cycle = 2 * total;
        const t = (elapsed * p.speed) % cycle;
        const idx = t < total ? Math.floor(t) : cycle - 1 - Math.floor(t);
        const frac = t < total ? t - Math.floor(t) : 1 - (t - Math.floor(t));
        const a = p.path[Math.min(idx, total - 1)]!;
        const b = p.path[Math.min(idx + 1, total)]!;
        p.group.position.lerpVectors(a, b, frac);
        p.group.lookAt(b.x, p.group.position.y, b.z);
        p.legPhase = elapsed;
      }
      // 视线锥
      const dx = playerPos.x - p.group.position.x;
      const dz = playerPos.z - p.group.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < p.visionDist) {
        const fwd = new THREE_NS.Vector3(0, 0, 1).applyQuaternion(p.group.quaternion);
        const ang = Math.abs(
          Math.atan2(
            fwd.x * dz - fwd.z * dx,
            fwd.x * dx + fwd.z * dz,
          ),
        );
        if (ang < p.visionAngle) {
          this.onStealthFail?.();
        }
      }
    }
    void dt;
    void scene;
    return promptHit;
  }
}
