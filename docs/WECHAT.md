# WECHAT.md —— 微信小游戏接入指南(M9 POC)

> 代码级 POC 已落地:`src/core/PAL/wechat/`(编译通过,`src/types/wechat.d.ts` 提供最小签名)。
> 真机联调按本指南执行;架构上游戏逻辑零改动,只替换 PAL 实现与渲染入口。

## 一、三步接入

### 1. PAL 替换

小游戏包入口不要引入 `core/PAL/web`(其实现触碰 DOM):

```ts
// 小游戏 main.ts
import { createWechatPAL } from './core/PAL/wechat/index.js';
// 以 createWechatPAL() 代替 initPAL();其余游戏代码不变
```

生产建议:vite 多入口(`index.html` + `minigame.html`)或构建条件注入,
`PAL/index.ts` 按平台分派(接口已冻结,替换成本 ≈ 1 行)。

### 2. 渲染:three-platformize

- `npm i three-platformize`
- 入口首行 `import 'three-platformize/src/PLATFORM_WECHAT';` —— 注入全局 canvas 与适配
- `Engine` 构造传 `pal().platform.getSurface()`(我们的 WechatPlatform 读全局 canvas)✓
- EffectComposer 的 `samples: 4` 在小游戏 WebGL1 降级为 0(已预留:检测 `renderer.capabilities.isWebGL2`)

### 3. 包体与资源

| 项 | 预算 | 本项目现状 |
|---|---|---|
| 主包(代码+首场景) | ≤ 4MB(硬限制) | JS ≈ 0.70MB ✓;章节地图程序化生成,无模型文件 ✓ |
| 字体 | 子集 178KB 或 CDN | 运行时 FontFace 在小游戏不可用 → 改 `wx.loadFont`(读包内子集)或纯 CDN css(裁剪)|
| 音频 | 主包不放 | SFX/BGM 预转 mp3 放 CDN,经 `WechatAudio.createPlayerByPath` 播放 |
| 贴图 | 程序化为主 | 立绘等大图全部 CDN 分包 |

**域名白名单(审核前置)**:`downloadFile` 合法域名填 CDN 域;`request` 填 API 域(见 docs/API.md)。
POC 阶段在开发者工具勾选「不校验合法域名」。

## 二、已知摩擦清单(PROMPT §4.8 对应)

| 摩擦 | 现状/对策 |
|---|---|
| 无 `document`/`fetch` | 加载器全部经 `PAL.Network` ✓;UI 层 DOM 后端不可用 → canvas 后端(见下) |
| 无 `localStorage` | `WechatStorage`(wx 同步存储)✓ |
| 无 `FontFace` API | 字体经 `wx.loadFont` 或系统字体兜底;`FontManager` 需按平台分派 |
| 无 `AudioContext.decodeAudioData` | `WechatAudio` 走 mp3 路径播放 ✓;程序化合成 SFX(BGM)在小游戏不可用 → 预转音频清单 |
| `requestAnimationFrame` | three-platformize 提供 |
| 触摸坐标 | `WechatInput` 已统一为 PAL Pointer/Touch 事件 ✓;虚拟摇杆(TouchControls 为 DOM)需以 canvas 版重绘 —— 接口一致,工作量 1 天 |

## 三、canvas UI 后端(已验证可运行)

- `?ui=canvas` 查询参数:加载页以 `CanvasLoading`(纯 2D 自绘,国风同 token)替代 DOM 版,
  证明 **UI 组件接口与后端无关**(PROMPT §4.5 的硬性要求)。
- M9 后续:把 `GamePanels/DialogUI/PlayerHUD` 逐个落到同一 canvas 后端(接口已冻结,机械工作)。
