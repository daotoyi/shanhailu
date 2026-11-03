# APP.md —— Capacitor 壳打包指南(P3)

> 判定线提醒(PROMPT §4.8):APP 继承 Web 全部约束,低端 Android WebView 跑 Three.js 难保 60fps;
> 中位机型实测 < 30fps 时优先降画质(设置页已有三档)。

## 打包步骤

```bash
npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/android @capacitor/ios
npm run build                      # 产物 dist/(base:'./' 已就绪)
npx cap add android && npx cap add ios
npx cap sync
npx cap open android               # Android Studio 出包
npx cap open ios                   # Xcode 出包
```

`capacitor.config.json` 已提交(appId `com.dahua.shanhai`,webDir `dist`,墨色启动底)。

## 平台差异对策

| 项 | 对策 |
|---|---|
| WebGL 性能 | 画质默认「中」;设置页可调;`pixelRatioScale` 低档 0.75 |
| 键盘不可用 | 触屏控件已就绪(虚拟摇杆+右侧视角,≥44px)✓ |
| 音频自动播放 | 「入荒」点击即 `PAL.Audio.unlock()` ✓ |
| 存档 | localStorage(Capacitor WebView 持久)✓;云端同步见 docs/API.md |
| 安全区(刘海) | `index.html` 增加 `viewport-fit=cover` + UI 舞台安全边距(M9 后续) |

## 版本计划

- v0.1 内测:Android APK 直装(签名自持)
- v0.2:接入 docs/API.md 云端存档;iOS TestFlight
