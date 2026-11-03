import { WebAudio } from './WebAudio.js';
import { WebInput } from './WebInput.js';
import { WebNetwork } from './WebNetwork.js';
import { WebPlatform } from './WebPlatform.js';
import { WebStorage } from './WebStorage.js';
import type { PALBundle } from '../types.js';

/** Web 平台 PAL 组装(唯一允许聚集宿主 API 的地方) */
export function createWebPAL(): PALBundle {
  const platform = new WebPlatform();
  return {
    platform,
    input: new WebInput(platform.getSurface()),
    storage: new WebStorage(),
    audio: new WebAudio(),
    network: new WebNetwork(),
  };
}
