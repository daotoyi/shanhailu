import { YAOWANG_VALLEY } from '../world/maps/YaowangValley.js';
import { DAHUANG_CITY } from '../world/maps/DahuangCity.js';
import { CHAPTER_MAPS } from '../world/maps/chapters.js';
import type { MapDefinition } from '../world/maps/types.js';

/**
 * 地图注册表(数据驱动,唯一内容来源):药王谷/大荒城 + 七章主线图。
 */
export const MAPS: Record<string, MapDefinition> = {
  [YAOWANG_VALLEY.id]: YAOWANG_VALLEY,
  [DAHUANG_CITY.id]: DAHUANG_CITY,
  ...Object.fromEntries(CHAPTER_MAPS.map((m) => [m.id, m])),
};

/** 开局地图与出生点 */
export const START_MAP_ID = YAOWANG_VALLEY.id;
export const START_SPAWN_ID = 'start';
