# 多 Session 真正并发 — 实施计划

**desired_location:** `docs/plans/plan-multi-session-concurrency.md`

## 当前背景

- 主进程已支持多 Agent loop 并行；前端存在单例 SSE、progress 猜绑、Tab 指示未接线等问题。
- 用户刚修复 Session 切换阻塞；现需补齐「真并发」底线 + Tab 级 Stop。

## 需求

### 功能需求

- 多个 Agent Session 可同时运行；切换 Tab 不阻塞、不串 SSE/进度
- Tab 显示 running / pending / completed-unread 状态
- 任意 running 的 Tab 可一键 Stop（含后台 Session）
- 后台 Session 完成时，非激活 Tab 显示 completed-unread

### 非功能需求

- 最小改动：不改 `agent:send` IPC
- 单测覆盖 progress 路由与 SSE 解绑隔离

## 设计决策

### 1. Progress 绑定

取消 `assignmentQueue` 猜绑；仅当 `payload.sessionId` 已在 `agentToChat` 或 `linkAgentSession` 后可路由。首条 `model/start` progress 带 `sessionId`，在 `applyProgressToChat` 内 link。

双 chat 同时 `beginRun`：在 `send()` 调用 `agentSend` 返回后从 `res.sessionId` 立即 `linkAgentSession`（Agent 模式返回里应有 sessionId）。

### 2. SSE 隔离

`Map<chatId, () => void>` 替代单例 `aiStreamUnsub`；`unbindAiStream(chatId)` 只解绑该 chat。

### 3. Tab Stop

Tab 上 running 态显示小 Stop 按钮；`stopAgentRunForChat(chatId)` 读 `getRunState(chatId).runningAgentSessionId` 调 `agentStop`。

## 技术设计

### 文件变更

- `src/composables/useChatSessionRuns.ts` — progress 路由、chat_mode 守卫
- `src/components/workbench/ChatPane.vue` — SSE map、Tab dot/stop、send 后 linkAgentSession
- `tests/unittest/UT-chat-session-runs/` — 新单测目录

## 实施计划

1. **阶段一：单测 + useChatSessionRuns**
   - 测双 chat progress 隔离；移除 assignmentQueue 猜绑
   - `chat_mode` 仅激活 chat 生效

2. **阶段二：ChatPane SSE + link**
   - Per-chat SSE map
   - `pushAssistantFromAgent` / `send` 完成后 link；progress 首包 link 兜底

3. **阶段三：Tab UI**
   - `tabDotFor` + Stop 按钮 + 样式
   - 手工验证双 Session 并发

## 测试策略

- Vitest：`useChatSessionRuns` 双 session progress、completedUnread
- Vitest：SSE unbind 隔离（可 mock 或抽 helper 单测）
- 全量 `UT-chat-session-run-state` 回归

## 发布与回滚

- 纯前端改动；回滚 revert 三文件即可
