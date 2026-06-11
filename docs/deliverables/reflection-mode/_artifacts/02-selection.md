# 方案选型记录

## 2a 选型摘要

**需求回顾：** 恢复 Reflection 聊天模式，用户发一条消息后自动在 Workshop 面板跑 Developer→Tech Lead→Reviewer→Tech Lead 的 1～3 轮反思循环，Tech Lead 收尾；与 Multi-Agent 互斥。

| 维度 | 提案 1 独立 Reflection 编排器 | 提案 2 Coordinator 内脚本路由 |
|------|------------------------------|-------------------------------|
| 核心思路 | 新建 `reflection-turn-orchestrator.ts`，IPC 按 `chatMode` 分支 | 在 coordinator-turn-engine 内用脚本化路由 |
| 主要改动范围 | chat-modes、ChatPane、workshop-ipc、新编排器 | coordinator-turn-engine、workshop-router |
| 优点 | 解耦、可控、易单测 | 文件更少 |
| 缺点 | 需新建 TL 纯文字发言 | Coordinator 更复杂；TL 工具冲突 |
| 工作量 | 中 | 中小 |
| 适合场景 | 长期维护、固定流程 | 最少新文件 |

**推荐：** 提案 1 – 独立 Reflection 编排器 + 复用 Multi-Agent 骨架

## 2b 用户最终选择

- **选定提案：** 提案 1 – 独立 Reflection 编排器 + 复用 Multi-Agent 骨架
- **调整说明：** 无额外调整，按 PRD 原样实现
