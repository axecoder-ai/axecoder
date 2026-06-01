# Diff 英文 + 会话级批量应用 — 实施计划

## 当前背景

- `ChatDiffCard` 使用中文「应用」「拒绝」。
- 多文件 pending 需逐卡点击；后端已有 `applyAllPendingInSession` 仅用于 `agentAutoApplyWrites`。

## 需求

### 功能需求

- 卡片按钮：Apply / Reject。
- `pendingWrites` 总数 > 0 时显示底栏：Apply all (N)、Reject all。
- 批量操作调用新 IPC，一次处理当前 `agentSessionId` 下全部 pending。

### 非功能需求

- 与现有 `pendingBusy`、进度条绑定一致；批量期间禁用重复点击。

## 设计决策

### 1. 批量粒度

- IPC 以 `sessionId` 为单位（与 backend `pendingById` 一致）。
- 前端若多条消息含 pending，按 `agentSessionId` 分组，依次调用（通常仅一组）。

### 2. UI 完成后状态

- `applyContinueToMessage` 后，清除同 `agentSessionId` 其它消息上的 `pendingWrites`，避免陈旧卡片。

## 实施步骤

1. TDD：`UT-agent-bulk/agent-bulk.test.ts`。
2. `agent-loop.ts` 实现并导出 `confirmAgentAllWrites` / `rejectAgentAllWrites`。
3. IPC + preload + 类型。
4. `ChatDiffCard` 英文。
5. `ChatPane` computed + 底栏 + handlers。
6. `npm test` 全绿。

## 文件变更

- `electron/main/agent/agent-loop.ts`
- `electron/main/agent-ipc.ts`
- `electron/preload/index.ts`
- `src/types/axecoder.d.ts`
- `src/components/workbench/ChatDiffCard.vue`
- `src/components/workbench/ChatPane.vue`
- `tests/unittest/UT-agent-bulk/agent-bulk.test.ts`
