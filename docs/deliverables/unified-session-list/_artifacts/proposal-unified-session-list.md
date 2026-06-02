## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** Chat Agents 列表与 Collab Workshop 列表合并统一管理；重设计 session 元数据与 index。
- **调研来源：** `docs/proposals/proposal-collab-workshop.md`、`electron/main/chat-store.ts`、`workshop-store.ts`、`AgentsPanel.vue`、`WorkshopPane.vue`
- **上游提案：** `docs/proposals/proposal-unified-session-list.md`（make-proposals 双方案版）
- **选定基础：** 提案 1 – 统一 Session 注册表
- **用户调整摘要：** 无

### 最终方案 – 统一 Session 注册表

- **概述：** `.axecoder/sessions/index.json` 存 `{ id, title, updatedAt, kind: 'agent' | 'workshop' }`；Agent 正文 `sessions/{id}.json`，Workshop 正文 `workshops/{id}.json`；启动时迁移旧 `workshops/index.json`；`AgentsPanel` 展示合并列表并带类型标签；`WorkshopPane` 移除左侧列表；`App.vue` 按 `kind` 路由到 Chat 或 Workshop。
- **相对选定提案的变更：** 无。
- **关键变更：** `electron/main/session/session-registry.ts`、`session-ipc.ts`；适配 `chat-store` / `workshop-store`；`AgentsPanel.vue`、`WorkshopPane.vue`、`App.vue`、preload、类型。
- **权衡：** 一次迁移；ID 仍用 `chat-` / `ws-` 前缀避免冲突。
- **验证：** `UT-unified-session-list` 单测 + 手工合并列表与切换。
- **待解决问题：** 新建入口 UI（双按钮）；消息体 union 留 Phase 2。

### 未采纳方案说明

- **未选：** 提案 2 Facade — 未满足「结构重新改」的长期目标。
