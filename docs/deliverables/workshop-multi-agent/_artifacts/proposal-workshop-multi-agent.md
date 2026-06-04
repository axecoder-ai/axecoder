## 已确认解决方案提案

**状态：** 已确认

**上下文：**
- **请求：** Multi-Agent 聊天模式即 Collab Workshop；侧栏 Workshop 按钮与模式合一；UI 统称 Multi-Agent。
- **选定：** 提案 1 + 用户调整（Workshop 显示名 → Multi-Agent）
- **调研：** `docs/deliverables/workshop-multi-agent/_artifacts/00-research-links.md`

### 最终方案 – Multi-Agent 模式映射 Workshop 会话

- **概述：** 保留 `SessionKind=workshop` 与 `workshop:*` IPC。`chatModeId=multi-agent` 时自动进入/创建 workshop 标签；离开 workshop 标签时恢复上一 Agent 模式。侧栏与会话列表 `workshop` 类型展示为 **Multi-Agent**。`multi-agent` 不再向 Agent 会话暴露 `Agent` 子代理工具。
- **关键变更：** `ChatPane.vue`、`chat-modes.ts`、`chat-mode.ts`、`AgentsPanel.vue`、`WorkshopChatSection.vue`、单测。
- **验证：** 选 Multi-Agent → 多角色群聊；选 Agent → 单 Agent；侧栏 New Multi-Agent 与模式一致。
- **待解决问题：** Workshop 与 Agent 模型选择仍独立（`modelId` vs `activeModelId`）。

### 未采纳

- 提案 2：统一 composer，本轮范围外。
