import * as THREE from 'three';
import { WorldEnvironment } from './Environment.js';
import { MapManager } from './MapManager.js';
import { Player } from '../actor/Player.js';
import type { InputManager } from '../core/Input/InputManager.js';
import type { EventBus } from '../core/events.js';
import { START_MAP_ID, START_SPAWN_ID } from '../data/maps.js';

/** 玩家碰撞半径 */
const PLAYER_R = 0.45;

export interface WorldEvents {
  onMapChanged?: (mapId: string, mapName: string) => void;
}

/**
 * 游戏世界组合层:环境 + 地图 + 玩家 + 传送/碰撞/边界。
 * main 只与 World 对话。
 */
export class World {
  readonly env = new WorldEnvironment();
  readonly maps: MapManager;
  readonly player: Player;
  readonly scene: THREE.Scene;
  /** 出生点(首次放置) */
  spawnPos = new THREE.Vector3();

  constructor(
    private readonly input: InputManager,
    private readonly bus: EventBus,
    private readonly events: WorldEvents = {},
  ) {
    this.scene = this.env.scene;
    this.maps = new MapManager(this.env);
    this.maps.loadInitial(START_MAP_ID, START_SPAWN_ID);
    const sp = this.maps.spawnOf(START_MAP_ID, START_SPAWN_ID);
    this.spawnPos.set(sp.pos[0], 0, sp.pos[1]);
    this.player = new Player(input, this.heightAt.bind(this), this.spawnPos.clone());
    this.scene.add(this.player.rig.root);
  }

  heightAt = (x: number, z: number): number => this.maps.map.heightAt(x, z);

  /** 切换地图(传送阵/剧情触发),返回出生点供相机 snap */
  switchMap(mapId: string, spawnId: string): THREE.Vector3 {
    this.maps.switchTo(mapId, spawnId);
    const sp = this.maps.spawnOf(mapId, spawnId);
    const y = this.maps.map.heightAt(sp.pos[0], sp.pos[1]);
    this.player.position.set(sp.pos[0], y, sp.pos[1]);
    this.player.heading = sp.heading;
    this.events.onMapChanged?.(mapId, this.maps.def.name);
    return this.player.position.clone();
  }

  update(dt: number, elapsed: number, camYaw: number): void {
    // 玩家移动(内部处理输入)
    this.player.update(dt, elapsed, camYaw);
    // 碰撞推离 + 地图边界
    this.resolveCollisions();
    // 地图内容动画
    this.maps.map.update(elapsed);
    // 传送检测
    this.checkTeleporters();
  }

  private resolveCollisions(): void {
    const p = this.player.position;
    for (const c of this.maps.map.colliders) {
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + PLAYER_R;
      if (d < min && d > 1e-4) {
        p.x = c.x + (dx / d) * min;
        p.z = c.z + (dz / d) * min;
      }
    }
    // 地图边界(圆形收拢)
    const r = Math.hypot(p.x, p.z);
    const maxR = this.maps.def.boundsRadius;
    if (r > maxR) {
      p.x *= maxR / r;
      p.z *= maxR / r;
      this.bus.emit('world:boundary', {});
    }
    // 贴地
    p.y = this.heightAt(p.x, p.z);
  }

  private teleportLock = 0;

  private checkTeleporters(): void {
    if (this.teleportLock > 0) {
      this.teleportLock--;
      return;
    }
    const p = this.player.position;
    for (const t of this.maps.map.teleporters) {
      if (Math.hypot(p.x - t.pos.x, p.z - t.pos.y) < t.radius) {
        this.teleportLock = 30; // 1.5s 内不重复触发(等待切图完成)
        this.bus.emit('world:teleport', { mapId: t.targetMapId, spawnId: t.targetSpawnId, label: t.label });
        return;
      }
    }
  }
}
