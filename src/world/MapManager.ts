import type { BuiltMap, MapDefinition } from './maps/types.js';
import { MAPS } from '../data/maps.js';
import { WorldEnvironment } from './Environment.js';

/**
 * 地图管理器:加载/卸载/切换;环境预设随图应用。
 * 程序化构建为同步(50~150ms),由 TransitionOverlay 遮罩期间执行。
 */
export class MapManager {
  private current: BuiltMap | null = null;
  private currentDef: MapDefinition | null = null;

  constructor(private readonly env: WorldEnvironment) {}

  get map(): BuiltMap {
    if (!this.current) throw new Error('[Map] 尚未加载任何地图');
    return this.current;
  }

  get def(): MapDefinition {
    if (!this.currentDef) throw new Error('[Map] 尚未加载任何地图');
    return this.currentDef;
  }

  /** 首次加载(无遮罩,由启动流程的加载页覆盖) */
  loadInitial(mapId: string, spawnId: string): void {
    this.switchTo(mapId, spawnId);
  }

  /** 切图:卸载旧图 → 构建新图 → 应用环境 */
  switchTo(mapId: string, spawnId: string): { map: BuiltMap; def: MapDefinition } {
    const def = MAPS[mapId];
    if (!def) throw new Error(`[Map] 未知地图: ${mapId}`);
    const spawn = def.spawns.find((s) => s.id === spawnId) ?? def.spawns[0]!;

    if (this.current) {
      this.env.scene.remove(this.current.group);
      this.current.dispose();
      this.current = null;
    }
    const map = def.build();
    this.env.scene.add(map.group);
    this.env.apply(def.environment);
    this.current = map;
    this.currentDef = def;
    void spawn;
    return { map, def };
  }

  /** 取出生点(切图后放置玩家用) */
  spawnOf(mapId: string, spawnId?: string): { pos: [number, number]; heading: number } {
    const def = MAPS[mapId]!;
    const s = def.spawns.find((x) => x.id === spawnId) ?? def.spawns[0]!;
    return { pos: s.pos, heading: s.heading };
  }
}
