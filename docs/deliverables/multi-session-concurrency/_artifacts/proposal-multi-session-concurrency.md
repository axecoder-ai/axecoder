## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 多 Agent Session 真正后台并发：切换不阻塞、SSE/进度不串线；Tab 可感知后台状态并对任意 Session 一键 Stop。
- **调研来源：** `docs/deliverables/multi-session-concurrency/_artifacts/00-research-links.md`；`ChatPane.vue`、`useChatSessionRuns.ts`、`agent-session-store.ts`
- **上游提案：** `docs/proposals/proposal-multi-session-concurrency.md`（双方案草稿）
- **选定基础：** 提案 1 – 前端隔离补丁
- **用户调整摘要：**
  - Tab 栏需支持对**后台运行中**的 Session 一键 Stop（不仅当前激活 Tab）
  - 其余按提案 1：Per-Session SSE、修复 progress 猜绑、Tab 圆点指示

### 现状总结

- 主进程 `Map` 存多 Agent session，`agent:send` 可并行 loop
- 前端 `useChatSessionRuns` 按 `chatId` 存 `runStates`，但 `loading/streamText` 等 UI 绑定 `activeRun`
- 单例 `aiStreamUnsub`；`finishRunUi` 全局 `unbindAiStream`
- `assignmentQueue` 在双 chat 同时 loading 时可能错绑 progress
- `tabDotFor` 已实现但未接入 Tab 模板

---

### 最终方案 – 前端 Per-Session 隔离 + Tab 指示与 Stop

- **概述：** 不改 IPC；渲染进程将 SSE 订阅、progress 绑定、Stop 操作按 `chatId` 隔离；Tab 显示 running/pending/completed-unread 状态，running Tab 提供 Stop 按钮（含非激活 Tab）。
- **相对选定提案的变更：** 在提案 1 基础上，Stop 从「仅当前 Tab」扩展为「任意 running Tab 可点 Stop」。
- **关键变更：**
  - `ChatPane.vue`：`aiStreamSubs: Map<chatId, unsub>`；`runPlainChat` / `finishRunUi` 按 chat 解绑
  - `useChatSessionRuns.ts`：移除 `assignmentQueue` 猜绑；无 `agentToChat` 映射且无 `sessionId` 的 progress 忽略；`chat_mode` 仅作用于 payload 已映射的 chat 且仅当该 chat 为激活 Tab 时改全局 `chatModeId`
  - `ChatPane.vue` Tab 模板：接入 `tabDotFor`；running 时 Tab 上显示 Stop（`@click.stop`），调用 `agentStop(getRunState(chatId).runningAgentSessionId)`
  - 单测：`UT-chat-session-runs` 或扩展现有 `UT-chat-session-run-state`
- **权衡：**
  - ✅ 小改、与 Session 切换修复兼容
  - ❌ 非激活 Tab 仍不显示完整进度流，仅圆点 + Stop
- **验证：**
  - 单测：双 chat progress 不串；`unbindAiStream(chatA)` 不影响 chatB
  - 手工：A 跑 Agent → 切 B → A Tab 点 Stop → A 停止、B 不受影响
- **待解决问题：**
  - Workshop 嵌入模式并发路径未全覆盖（本迭代以 Agent 直聊为主）

### 未采纳方案说明

- **未选：** 提案 2 RunOrchestrator + 早返回 sessionId
- **原因：** 用户选型；改动面与回归成本高于当前需求
