# 选型记录 — workshop-sse-chat

## 2a 选型摘要

**需求：** Collab Workshop 模型输出与主聊天一致支持 SSE 流式打字，保留多角色气泡。

| 维度 | 提案 1 扩展 workshop:progress | 提案 2 复用 ai:stream |
|------|------------------------------|------------------------|
| 核心思路 | status + delta 单通道 | ai:stream + workshop:progress |
| 推荐 | ✅ 推荐 | 用户选定 |

**推荐：** 提案 1 — 隔离 Chat、单通道维护成本低。

## 2b 用户选择

- **选定提案：** 提案 2 – 复用 `ai:stream` + streamId 绑定角色
- **调整说明：** 无额外调整

## 2c 落盘时间

2026-06-02
