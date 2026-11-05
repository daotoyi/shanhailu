# 大荒山海录

《山海经》世界观 × 上古神话改编的**单机剧情向 3D ARPG**。Three.js + TypeScript + Vite,零外部运行时依赖、断网可玩;美术资产全部程序化生成或来自可商用来源。

## 快速开始

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # tsc --noEmit + vite build → dist/
npm run preview    # 预览生产构建
npm run typecheck  # 仅类型检查
npm run fonts      # 重新生成中文字体子集(需源字体,产物已随仓库提供)
```

> 部署前务必执行 `npm run build`;`dist/` 是构建产物且被 git 忽略,直接发布旧目录会发到过期版本。
> 字体子集 `public/assets/fonts/dashan-subset.woff2` 需入库;缺失时 `FontManager` 自动降级到系统楷体,不阻塞启动。

调试入口:F3 面板(fps / draw calls / 三角面 / 显存 / 坐标)、`?ui=canvas` 切换 canvas UI 后端加载页 POC、控制台 `window.__shanhai` 暴露运行时对象。按键映射见 `src/data/input-bindings.ts`。

## 架构分层(强制)

```
core     引擎封装:Renderer / Time / Input / PAL / 对象池 / 事件总线
render   天空 / 雾 / 水面 / 后处理 / 过场      ← 只被上层调用
world    地图 / 地形 / 物件 / 触发器 / 传送
actor    玩家 / NPC / 怪物 / 神兽 + 状态机
combat   技能 / 伤害 / Buff / AI / 弹道
gameplay 任务 / 剧情 / 背包 / 装备 / 炼药 / 神兽 / 图鉴 / 成就 / 存档
data     全部配置表与类型,唯一内容来源;不 import 其它层
ui       全部界面,唯一允许碰 DOM 的层
audio    程序化音频编排
```

两条硬约束:
1. **平台能力只经 `core/PAL`**(输入 / 存储 / 音频 / 网络 / 平台能力),业务层禁止直接调用 `document`、`localStorage`、`WebAudio`、`fetch`——否则微信小游戏与 APP 移植需返工。
2. **内容数据驱动**:剧情 / 任务 / 物品 / 怪物 / 技能 / 地图参数一律在 `src/data/`,改内容不改代码。

## 文档索引

| 文件 | 内容 |
|---|---|
| `docs/PROMPT.md` | 开发任务书(§6 里程碑 / §7 质量红线 / §8 执行规则) |
| `docs/DESIGN.md` | 架构与模块接口 |
| `docs/PLAN.md` | 里程碑映射与 commit 锚点 |
| `docs/ACCEPTANCE.md` | 全里程碑验收总录 |
| `docs/TESTING.md` | 分里程碑自测记录 |
| `docs/API.md` | 云端存档 REST 预留签名 |
| `docs/WECHAT.md` / `docs/APP.md` | 微信小游戏 / Capacitor 接入指南 |
| `docs/NAMES.md` | 名称来源与 IP 改编对照(§2.7) |
| `assets/CREDITS.md` / `public/assets/manifest.json` | 资产来源与许可证登记 |

## 当前状态

M0~M9 全部完成(真实锚点见 `docs/ACCEPTANCE.md`),其后有 6 次 UX / 视觉优化提交与一次全量审查 A+B 修复。2026-11-05 追加独立内容轮:序~终章九章剧情(章节剧本表 `src/data/story/chapters.ts`、23 棵对话树、12 段运镜、18 个主线任务、4 名古神话引路人),任务链与章节流转改为表驱动。Web 端为主线成品,内容轮已于 2026-11-05 部署并推送,线上站点 / GitHub / 本地源码三方一致;微信小游戏与 APP 目前为 PAL 适配层 + 配置/指南级 POC,真机接入与两份可运行 POC 尚未落地;支线 / 全量异兽 / 创角系统属下一轮,详见 `docs/ACCEPTANCE.md` 已知问题与内容轮末节。

## 许可

见 `LICENSE`;字体与第三方资产许可见 `assets/CREDITS.md`。
