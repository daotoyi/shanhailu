import { YAOWANG_VALLEY } from '../world/maps/YaowangValley.js';
import { DAHUANG_CITY } from '../world/maps/DahuangCity.js';
import type { MapDefinition } from '../world/maps/types.js';

/**
 * 地图注册表(数据驱动,唯一内容来源)。
 * M7 主线图(九黎/汤谷/蜃楼城/昆仑/幽都/水泽/不周山)在此追加。
 */
export const MAPS: Record<string, MapDefinition> = {
  [YAOWANG_VALLEY.id]: YAOWANG_VALLEY,
  [DAHUANG_CITY.id]: DAHUANG_CITY,
};

/** 开局地图与出生点 */
export const START_MAP_ID = YAOWANG_VALLEY.id;
export const START_SPAWN_ID = 'start';
