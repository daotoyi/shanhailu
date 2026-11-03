#!/usr/bin/env node
/**
 * 字体子集化管线(PROMPT §4.9):
 *   1. 扫描 src/** 与 index.html,抽取全部实际用到的 CJK 字符;
 *   2. 附加 ASCII 可打印集 + 中文标点基础集;
 *   3. 以 subset-font(harfbuzz)产出 woff2 子集 → public/assets/fonts/dashan-subset.woff2。
 *
 * 源字体获取:--in 指定本地字体文件;否则尝试从 CDN 拉取霞鹜文楷(可商用,OFL-1.1)
 * 并缓存于 tools/.cache/;全部失败时打印手动放置指引后以非零码退出。
 *
 * 用法:npm run fonts [-- --in /path/to/LXGWWenKai-Regular.ttf]
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = path.join(ROOT, 'public/assets/fonts/dashan-subset.woff2');
const CACHE_DIR = path.join(ROOT, 'tools/.cache');
const CACHE_FONT = path.join(CACHE_DIR, 'source-font.bin');

const CDN_CANDIDATES = [
  'https://github.com/lxgw/LxgwWenKai/releases/download/v1.520/LXGWWenKai-Regular.ttf',
  // 国内网络 GitHub 直连易超时,加速镜像作后备(按序尝试)
  'https://ghfast.top/https://github.com/lxgw/LxgwWenKai/releases/download/v1.520/LXGWWenKai-Regular.ttf',
  'https://gh-proxy.com/https://github.com/lxgw/LxgwWenKai/releases/download/v1.520/LXGWWenKai-Regular.ttf',
];

function collectSourceText() {
  const chunks = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        walk(full);
      } else if (/\.(ts|css|html|json)$/.test(entry.name)) {
        chunks.push(fs.readFileSync(full, 'utf8'));
      }
    }
  };
  walk(path.join(ROOT, 'src'));
  const indexHtml = path.join(ROOT, 'index.html');
  if (fs.existsSync(indexHtml)) chunks.push(fs.readFileSync(indexHtml, 'utf8'));
  return chunks.join('\n');
}

function buildCharset() {
  const used = new Set(collectSourceText());
  const base = [];
  for (let c = 0x20; c <= 0x7e; c++) base.push(String.fromCharCode(c)); // ASCII 可打印
  const extra =
    '，。、；：？！「」『』（）《》〈〉——……·—～℃％' +
    '零一二三四五六七八九十百千万亿壹贰叁肆伍陆柒捌玖拾' +
    '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥' +
    '山海经大荒南北东西录';
  const charset = new Set([...base, ...extra, ...used]);
  // subset-font 需要字符串(可含 UTF-16 代理对字符)
  return [...charset].join('');
}

async function obtainSourceFont(argv) {
  const inIdx = argv.indexOf('--in');
  if (inIdx >= 0 && argv[inIdx + 1]) {
    const p = path.resolve(argv[inIdx + 1]);
    if (!fs.existsSync(p)) throw new Error(`--in 字体文件不存在: ${p}`);
    console.log(`[fonts] 使用本地源字体: ${p}`);
    return fs.readFileSync(p);
  }
  if (fs.existsSync(CACHE_FONT)) {
    console.log('[fonts] 命中缓存源字体');
    return fs.readFileSync(CACHE_FONT);
  }
  const require = createRequire(import.meta.url);
  const fetchFn = globalThis.fetch;
  for (const url of CDN_CANDIDATES) {
    try {
      console.log(`[fonts] 尝试拉取: ${url}`);
      const res = await fetchFn(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      // 校验字体魔数:ttf/otf(0x00010000/OTTO)或 woff/woff2
      const magic = buf.readUInt32BE(0);
      const ok = [0x00010000, 0x4f54544f, 0x774f4646, 0x774f4632].includes(magic);
      if (!ok || buf.length < 500_000) throw new Error('非字体文件或过小(css 占位)');
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(CACHE_FONT, buf);
      console.log(`[fonts] 已缓存 ${(buf.length / 1048576).toFixed(1)}MB`);
      return buf;
    } catch (e) {
      console.warn(`[fonts] 失败(${e.message}),尝试下一来源`);
    }
  }
  console.error(
    [
      '[fonts] 所有来源失败。请手动下载霞鹜文楷(OFL-1.1 可商用):',
      '  https://github.com/lxgw/LxgwWenKai/releases (LXGWWenKai-Regular.ttf)',
      '然后执行: npm run fonts -- --in /path/to/LXGWWenKai-Regular.ttf',
      '注:运行时 FontManager 会自动走 CDN 分块/系统字体降级,不阻塞游戏。',
    ].join('\n'),
  );
  process.exit(1);
}

async function main() {
  const argv = process.argv.slice(2);
  const charset = buildCharset();
  console.log(`[fonts] 字符集规模: ${charset.length}`);
  const source = await obtainSourceFont(argv);
  const require = createRequire(import.meta.url);
  const subsetFont = require('subset-font');
  const out = await subsetFont(source, charset, { targetFormat: 'woff2' });
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, out);
  console.log(
    `[fonts] 完成 → ${path.relative(ROOT, OUT_PATH)} (${(out.length / 1024).toFixed(0)}KB,原 ${(source.length / 1048576).toFixed(1)}MB)`,
  );
}

main().catch((e) => {
  console.error('[fonts] 子集化失败:', e.message);
  process.exit(1);
});
