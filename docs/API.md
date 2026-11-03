# API.md —— 云端同步接口预留(PROMPT §4.8)

> MVP 为纯单机(断网可玩)。以下 REST 接口为 P3 联网扩展预留,客户端全部经 `PAL.Network` 访问,签名不变。
> 鉴权:Bearer JWT;编码 UTF-8;时间 ISO8601。

## 1. 账号

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/v1/auth/guest` | 游客注册,返回 `{ token, playerId }`(设备指纹幂等) |
| POST | `/v1/auth/wx-login` | 微信登录:`{ code }` → `{ token, playerId }` |

## 2. 存档同步(PAL.Storage 之上)

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/v1/saves/slots` | 云端档位列表 `[{ slot, savedAt, chapter, playtimeSec }]` |
| PUT | `/v1/saves/:slot` | 上传存档体(body = 本地 SaveData JSON + `hash`) |
| GET | `/v1/saves/:slot` | 下载存档体 |
| POST | `/v1/saves/import` | base64 存档码导入校验 |

冲突策略:`savedAt` 新者胜;服务端保留最近 3 版历史。

## 3. 图鉴/成就同步

| 方法 | 路径 | 说明 |
|---|---|---|
| PUT | `/v1/bestiary` | 全量上报 `{ records, contracted }` |
| PUT | `/v1/achievements` | 全量上报 `{ unlocked }` |

## 4. 版本与公告

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/v1/version` | `{ latestVersion, minVersion, notice }`(强更/公告) |

## 错误约定

`{ error: { code: string; message: string } }`;`code ∈ { AUTH_EXPIRED, SLOT_CONFLICT, RATE_LIMITED, INTERNAL }`。
客户端收到 `AUTH_EXPIRED` 静默重登游客;单机模式任何网络失败不阻塞游戏。
