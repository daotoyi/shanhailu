/**
 * 字体三级降级(PROMPT §4.9):本地子集 → CDN 分块 webfont → 系统楷体。
 * 永不阻塞进入游戏;仅 ui/ 层允许触碰 document.fonts。
 */

const SUBSET_URL = './assets/fonts/dashan-subset.woff2';
const CDN_CSS = 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css';
const FAMILY = 'DashanWenKai';

export type FontSource = 'subset' | 'cdn' | 'system';

async function tryLoadSubset(timeoutMs = 3000): Promise<boolean> {
  try {
    const face = new FontFace(FAMILY, `url(${SUBSET_URL})`, {
      weight: '400 700',
      display: 'swap',
    });
    const timer = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeoutMs),
    );
    const loaded = await Promise.race([face.load(), timer]);
    if (loaded instanceof FontFace) {
      document.fonts.add(loaded);
      await document.fonts.load(`16px ${FAMILY}`, '大荒山海录');
      return document.fonts.check(`16px ${FAMILY}`, '大荒');
    }
    return false;
  } catch {
    return false;
  }
}

async function tryLoadCdn(timeoutMs = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CDN_CSS;
    const done = (ok: boolean) => {
      clearTimeout(timer);
      resolve(ok);
    };
    const timer = setTimeout(() => done(false), timeoutMs);
    link.onload = () => {
      // CDN 包以 LXGW WenKai 族名注册,别名映射到游戏字体族
      const style = document.createElement('style');
      style.textContent = `@font-face { font-family: '${FAMILY}'; src: local('LXGW WenKai'); }`;
      document.head.appendChild(style);
      done(true);
    };
    link.onerror = () => done(false);
    document.head.appendChild(link);
  });
}

/** 进游戏前调用;任何失败都静默降级,返回实际来源供 F3/日志展示 */
export async function ensureGameFonts(): Promise<FontSource> {
  if (await tryLoadSubset()) return 'subset';
  if (await tryLoadCdn()) return 'cdn';
  return 'system';
}
