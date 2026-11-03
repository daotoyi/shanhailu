import type { IPALNetwork } from '../types.js';

/**
 * Web 网络实现:fetch 封装。游戏内一切资源加载须经本接口,
 * 为微信小游戏(无 fetch,须 wx.request / 独立加载器)预留替换位。
 */
export class WebNetwork implements IPALNetwork {
  async fetchText(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`[PAL.Network] ${res.status} ${url}`);
    return res.text();
  }

  async fetchJSON<T>(url: string): Promise<T> {
    return JSON.parse(await this.fetchText(url)) as T;
  }

  async fetchBinary(url: string): Promise<ArrayBuffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`[PAL.Network] ${res.status} ${url}`);
    return res.arrayBuffer();
  }
}
