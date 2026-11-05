# ACCEPTANCE —— 全里程碑验收记录(M0~M9 完结)

> 用户授权连续推进,决策采用默认推荐方案;本文档为异步验收总录,git log 与各 commit 为最终事实。

## 总览

| 里程碑 | commit | 状态 |
|---|---|---|
| M0 脚手架与渲染基线 | 3805d2b / ab8b21a | ✅ 用户已阅 |
| M1 角色与输入 | ca528fe | ✅ |
| M2 地图与导航 | 58cb98d | ✅ |
| M3 剧情·对话·任务·存档·过场·潜行 | 264d2cc | ✅ |
| M4 战斗系统 | bca2e34 | ✅ |
| M5 成长与物品 | 0eda709 | ✅ |
| M6 神兽系统 | 3802871 | ✅ |
| M7 主线内容(二~终章) | 18ab62e | ✅ |
| M8 打磨 | 6e5fc27 | ✅ |
| M9 跨平台准备 | f6a5251 | ✅ |
| 后续 UX/视觉优化(6 次提交) | 2a410f4 … f0404ac | ✅ |

> 注:历史曾 rebase,旧文档中的 11 个 hash 均为 rebase 前对象,已按当前 `git log` 刷新;续跑请以 `git log` / HEAD 为准。

## 各里程碑验收要点

- **M1**:程序化药童 Rig(斗笠/药篓)+ 状态机程序动画;第三人称跟随相机(避让/震屏);键鼠+触屏同权。实测位移/方向/贴地。
- **M2**:地图框架(MapDefinition/MapManager/常驻环境层);药王谷完整版+大荒城;国风过场切图;碰撞+边界;canvas 罗盘小地图。传送链端到端实测。
- **M3**:对话(打字机/印章头像/分支/回顾/效果指令)、任务(六类目标/HUD)、存档(版本化/3+1档/导出码/神祠菜单)、运镜过场(可跳)、潜行(视线锥)。序章→第一章全流程实测;存读档闭环。
- **M4**:§3.5 伤害公式+五行克制;技能表数据驱动(普攻三连/3技能/大招充能);hitstop+震屏+飘字;AI 五态机;Boss 多阶段+预警圈+弹幕;掉落磁吸;死亡复活;战斗 HUD。序章教学战实测。
- **M5**:等级/经验/六境界突破;24 格背包/六栏装备五品阶+强化;武器可视三型;炼药(成功率/暴击/等级);商店买卖;掉落表;数值闭环实测(升级→突破→装备→炼药→购买→用药)。
- **M6**:山海经异兽三用(九尾狐/鹿蜀/毕方+原文引句);程序化拼装外观;缚灵索捕捉(血量概率);协战 AI(跟随+技能+治疗);喂养升阶;骑乘(移速+3.2);图鉴页签。全链实测。
- **M7**:七图主题工厂(图腾柱/扶桑神树视觉锤/幻塔/雪峰/鬼门/栈道/断天柱天光);七 Boss(傀儡/金乌/蜃妖/刺客/鬼王/相柳/共工三阶段);章节链自动接取;城市南征门+双传送阵;结局过场(不周天倾,留续章)。**全主线端到端通关实测:13 旗标全齐,任务全清,等级 1→6。**
- **M8**:程序化音频(五声古琴 BGM 每图换调 + 十类 SFX + 三轨音量持久化);11 成就(印章功业簿);设置页签(音量/画质/灵敏度即时生效)。
- **M9**:canvas UI 后端可运行 POC(?ui=canvas,点击入荒→引擎启动,证明接口与后端无关);微信小游戏 PAL 五类实现(编译通过)+ 接入指南;Capacitor 配置+指南;云端 REST 预留签名。首包 0.71MB(gzip 196KB)≪ 4MB。

## 红线自检(PROMPT §7)

- **画质**:全场景 ACES+Bloom+雾+暗角+轮廓光;风格统一低饱和青绿;每图记忆点 ✓
- **手感**:输入 <100ms;前后摇明确;命中必有飘字+hitstop(+音效)✓
- **UI**:国风 token 统一;1280×720 全分辨率缩放;面板动效齐备 ✓
- **性能**:前台实测 100fps(M0 时点);首包 ≪10MB ✓。**draw calls 于 2026-11-05 复测:修复前 494~506、修复后默认画质 192~354(仍高于红线 200),低画质档 176 达标**;F3 口径含阴影 pass 与后处理全屏 pass,与 §4.7 口径需统一,旧记录「≤141」已失效。
- **稳定**:`tsc --noEmit` 零错误;`npm run build` 通过;存读档无损;断网可玩 ✓
- **内容**:文案全自拟改编(§2.7),数据表齐备可改 ✓

## 已知问题(遗留,不阻塞)

1. 微信小游戏/Capacitor 真机验证待用户执行(代码级 POC + 指南已交付)。
2. canvas UI 后端仅加载页落地;面板/对话框落 canvas 为机械工作(接口已冻结)。
3. WechatAudio 无 decode:程序化 BGM 在小游戏端需预转 mp3 清单(指南已写)。
4. hit 音效未单独接事件(攻击音已覆盖主要反馈)。
5. 前台 fps 以 M0 实测 100 为准;夜间后台窗口 rAF 节流属宿主行为。
6. dev 冷启动 4~6s(Vite 首转换+程序化生成);生产构建无此问题。
7. 安全区(刘海)适配留 APP v0.2。
8. **默认画质 draw calls 仍高于 §4.7 红线**(静态合批后 192~354,低画质档 176 达标);需进一步削减阴影投射对象或统一 F3 统计口径。
9. M9 两份可运行 POC(three-platformize 小游戏工程 / Capacitor 壳)未落地,当前仅 PAL 适配层 + 配置/指南。
10. `WechatStorage.get()` 误取 `r.data`(真机 API 返回存储值本身),小游戏端读档会失败;`WechatAudio.decode/createPlayer` 为 throw 空壳。
11. 创角系统(§3.1 姓名/性别/五族出身/天赋)未实现,主角名硬编码于 `dialogs.ts` 与 `DialogUI.ts`。
12. `ssao` 与 `SkillDef.element` 为死字段;自动存档与手动「档位 1」共用 slot 0。
13. 单文件 >400 行(§8.5):`main.ts` 620 / `ScenarioDirector.ts` 511 / `GamePanels.ts` 480。
14. 低画质档 composer 的 bloom RT 仍常驻;直出方案实测更费 draw calls 且观感与中高档不一致,已回退,待配套色彩校准再评估。

## 2026-11-05 全量审查修复(A+B 批次)

按用户「按 A+B」执行,全程 `tsc --noEmit` 零错误 + `npm run build` 通过(113 modules / gzip 202.17KB),浏览器(Playwright + headless Chrome)回归。

| 项 | 修复 | 验证 |
|---|---|---|
| BGM 静默 | 删除 `AudioDirector.init()` 的无效 44 字节 `decode` 调用,直接建轨启 BGM | 浏览器实测 1150ms BGM 定时器已注册,console 不再出现 `EncodingError 初始化降级` |
| 打字机空白 | `DialogRunner.onTypeDone()` 渲染选项后补全正文 | 代码路径核对 |
| 存档安全 | `SaveSystem` 增加字段级校验/ID 白名单、`applySave` try/catch、F3 改纯文本写入、神祠菜单补「导入存档码」 | 实测正常码导入成功、恶意 `chapter` 与残缺档均被拒 |
| console 报错 | `index.html` 内联 favicon data URI | 实测 errors 为空(此前 2 次 `/favicon.ico` 404) |
| 文档/工程 | 刷新 commit hash、补 `docs/NAMES.md`、重写 README、字体子集改为可入库、还原权限、刷新 `dist/` | `git diff` 与文档核对 |
| 切图泄漏 | 新增 `world/dispose.ts`;天空/远山改为只更新 uniform 不重建;三处 `BuiltMap.dispose` 覆盖 Points;清场统一走 `CombatSystem.clearEnemies()` | 反复切图 8 次 geometries 由「286→323 单调增长」变为稳定 195~201 |
| hitstop 计时 | `SkillExecutor.update` 拆分 animDt/logicDt;CD/无敌帧/AI/毒 DOT 用真实 dt | 类型检查 + 运行无异常 |
| PostFX | `setSize/syncPixelRatio` 联动 composer 的 `_pixelRatio`,修复 HiDPI 发糊与降分辨率不生效 | 截图对比;低画质直出方案实测不利已回退 |
| 每帧分配 | 敌人 ctx / 神兽 hooks 复用、`ScenarioDirector` dirty 旗标、`PlayerHUD` DOM diff | 类型检查 + 运行无异常 |
| draw calls | 新增 `world/batchStatic.ts`,按材质+几何属性签名合并静态件(发光件限同父组以保护旋转动画),接入 `MapManager.switchTo` | 地图 Mesh 由上百降至 30;draw calls 506→默认画质 192~354、低画质 176;high 截图画面完整无破损 |

未执行(需另行决策):批次 C 跨端架构收口、批次 D 内容轮与文件拆分,见上「已知问题」8~13。

## 复跑方式

```bash
npm install && npm run dev    # http://127.0.0.1:5173
npm run build && npm run preview
npm run fonts                 # 字体子集化(可离线 --in 手动指定)
# ?ui=canvas                  # canvas UI 后端 POC
```
