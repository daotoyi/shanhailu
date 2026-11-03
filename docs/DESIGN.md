# DESIGN.md —— 《大荒山海录》架构设计

> 依据 `docs/PROMPT.md` §4 技术方案落地。本文档随里程碑演进,M0 为基线版。

## 1. 选型(已定)

Three.js(r180)+ TypeScript(strict)+ Vite。自研轻量框架:组件化组合 + 类型化事件总线 + 状态机(M4)+ 服务定位器。不引入 UI 框架。

## 2. 架构分层(强制,对应 PROMPT §4.2)

```
core    引擎封装:Engine(主循环)/Time/Input/PAL/EventBus/Services/ObjectPool
render  天空/雾/水/后处理/画质档/VFX —— 只被上层调用
world   地图/地形/物件/触发器/传送
actor   玩家/NPC/怪物/神兽(M1+)
combat  技能/伤害/Buff/AI/弹道(M4+)
gameplay 任务/剧情/背包/装备/炼药/神兽/图鉴/成就/商店/存档(M3+)
data    全部配置表(TS 常量+类型),唯一内容来源,不 import 其他层
ui      全部界面,唯一允许碰 DOM 的层
audio   WebAudio 管理(M5+ 接入内容,PAL.Audio 接口 M0 已定)
```

层间只经公共接口访问;运行时数值计算只读 `src/data` 配置表。

### DOM 边界约定(重要)

- **`ui/` 层**:唯一允许操作界面 DOM 的层(虚拟分辨率舞台、面板、加载页、F3)。
- **`core/PAL/web/*`**:平台实现层,是宿主 API 的**指定栖身地**——surface canvas 获取、
  `localStorage`、`WebAudio`、`fetch`、`navigator.vibrate` 等只出现在这里。
- 其余任何层禁止 `document` / `window` / `localStorage` / `fetch` 直调。

## 3. PAL 平台抽象层(M0 即落地,PROMPT §4.8)

五类接口(`src/core/PAL/types.ts`),Web 默认实现(`src/core/PAL/web/`):

| 接口 | 职责 | Web 实现 |
|---|---|---|
| `IPALInput` | 键盘/指针/触摸原始事件、指针锁定 | Pointer Events + KeyboardEvent |
| `IPALStorage` | KV 存储(存档/设置) | localStorage(隐私模式降级内存 Map) |
| `IPALAudio` | 解码/播放器/主音量/手势解锁 | WebAudio AudioContext |
| `IPALNetwork` | 文本/JSON/二进制拉取 | fetch(加载器统一走此接口) |
| `IPALPlatform` | surface/resize/时间/震动/分享/触屏判定 | DOM canvas + window resize |

`initPAL()` 按环境检测分发(当前仅 web;微信小游戏实现列于 M9,接口今日即冻结)。
后续移植 = 新增 `core/PAL/wechat/`、`core/PAL/app/` 实现包,**零逻辑返工**。

## 4. 输入抽象(PROMPT §4.6)

`core/Input` 把 PAL 原始事件映射为**语义动作**(键位表在 `data/input-bindings.ts`,数据驱动):
`Move(向量)/Dodge/Skill1-4/Ult/Interact/Camera(look+zoom)` + 调试动作(F3)。
提供轮询态(`isDown/consumeLook`)与边沿事件(经 EventBus)。触屏摇杆 M1 加入,接口已预留 `onTouch`。

## 5. 渲染基线(PROMPT §4.3,M0 范围)

- 色调:ACESFilmic + sRGB 输出;后处理链:RenderPass → Bloom(克制) → 暗角 → OutputPass。
- 天空:自定义渐变穹顶 shader(天顶青碧→地平雾白)+ 太阳盘 + 光晕。
- 远山:3 层程序化噪声山脊剪影环,按距离手工混入雾色(`fog:false`,远于雾有效距离)。
- 雾:FogExp2,密度 0.009,色近地平线。
- 水面:自定义 shader —— 多向正弦波 + 解析法线 + 菲涅尔反射天空色 + 太阳高光 + 径向近岸渐变(深→浅+透明度)+ 场景雾接入。
- 地形:fBm 高度场山谷(环形山脊围合)+ 池塘盆地 + 出生点整平;顶点色(草地/砂岸/岩坡/高山岩)分区,flatShading 风格化。
- 植被/山石:InstancedMesh(松/阔叶/桃树、噪声位移岩),instanceColor 变化。
- 地标(记忆点):神祠——石台+朱柱+双层攒尖顶+发光供灯(Bloom 拾取);萤火粒子(加法混合)。
- 灯光预设:半球环境 + 暖主光(投影)+ 冷色轮廓光。
- 画质三档:`data/quality-presets.ts` 驱动(分辨率缩放/阴影/阴影尺寸/Bloom/暗角);SSAO 高档位,M8 实现。

## 6. UI 方案(PROMPT §4.5)

- 虚拟设计分辨率 **1280×720**,`ui/UIRoot` 整体 transform 缩放适配,letterbox 露墨色底。
- 组件接口与后端分离:`ui/framework/types.ts` 定义 `IUIPanel/IUIButton/IUILabel/IUIProgressBar/IUIToast`;
  `ui/dom/` 为 DOM 后端实现;M9 以 canvas 后端实现同一接口接入微信小游戏。
- 轻量补间 `ui/framework/Tween.ts`(面板开关动效必须走它,禁生硬闪现)。
- 国风 token:墨 `#17130e` / 檀 `#2b2018` / 鎏金 `#c9a25c` / 朱砂 `#b03a2e` / 青碧 `#3f6f5f` / 月白 `#e8e2d3`。
- F3 调试面板:fps/耗时/draw calls/三角面/几何体/纹理/程序/JS 堆/相机坐标/画质档。

## 7. 字体子集化管线(PROMPT §4.9)

- `tools/font-subset.mjs`:构建期从 `src/**` + `index.html` 抽取全部 CJK 字符 + ASCII 基础集,
  以 `subset-font`(harfbuzz)产出 `public/assets/fonts/dashan-subset.woff2`;源字体自动尝试 CDN 拉取并缓存,失败则提示手动放置。
- 运行时 `ui/FontManager`:本地子集 → CDN webfont(分块按需)→ 系统楷体,三级降级,永不阻塞进游戏。
- 严禁整包 CJK 字体入首包。

## 8. 资产策略

M0 全程序化生成,零外部资产。`public/assets/manifest.json` 登记制 + `assets/CREDITS.md`,
后续任何外部资产(含字体)必须先登记再入库(PROMPT §4.4)。

## 9. 目录速查

```
src/core/{Engine,Time,EventBus,Services,ObjectPool}.ts + Input/ + PAL/
src/render/{SkyDome,Water,Silhouettes,PostFX,Quality}.ts
src/world/{Noise,Terrain,Vegetation,Shrine,Fireflies,DemoValley,DebugCamera}.ts
src/ui/{UIRoot,UIManager,LoadingScreen,F3Panel,FontManager,theme.css} + framework/ + dom/
src/data/{input-bindings,quality-presets}.ts
tools/font-subset.mjs
```
