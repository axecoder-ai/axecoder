## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** `Task` + `run_in_background` 启动后，父 Agent 回复完成时 Chat 应持续展示子任务进度；刷新/重启后可恢复终态。
- **调研来源：**
  - `docs/deliverables/agent-sse-progress-ui/_artifacts/00-research-links.md`
  - `docs/deliverables/agent-subagent-parity/_artifacts/00-research-links.md`
  - `electron/main/agent/tool-executor.ts:493-531`、`agent-subagent-tasks.ts`、`ChatPane.vue`
- **上游提案：** `docs/proposals/proposal-background-subtask-ui.md`（双方案版）
- **选定基础：** 提案 2 – 消息锚定 + 持久化子任务卡片
- **用户调整摘要：**
  1. 重启后从 `.axecoder/subagent-output/{taskId}.txt` hydrate 终态
  2. running 期间 SSE 断连时用低频 IPC 轮询兜底
  3. 同一 turn 多次 `Task` 在 assistant 落盘前一次性写齐 `backgroundTaskIds`
  4. 不考虑实现复杂度，以效果、稳定、风险为决策标准

### 现状总结

- 后端已 `emitAgentProgress({ kind: 'subagent' })`，`agent:listBackgroundTasks` IPC 已存在
- 前端子任务 UI 仅在 `loading` 进度气泡内（`AgentProgressStream`），`send` 结束即 `clearProgressUi()`
- `agent-subagent-tasks.ts` 的 `runs` 为进程内 Map；`finalizeBackgroundRun` 会落盘 output 文件

---

### 最终方案 – 消息锚定后台子任务卡片

- **概述：** 父 Agent 一轮内启动的所有后台 `Task`，在 `AgentSendResult` 中返回 `backgroundTaskIds`，写入 assistant 消息的 `backgroundTaskIds` 字段并持久化。消息下渲染 `BackgroundTaskCard`，通过 SSE `subagent` 事件 + `agent:resolveBackgroundTasks` 轮询双通道更新；进程重启后按 taskId 读 output 文件恢复终态。
- **相对选定提案的变更：** 无偏离；用户三条稳定补强全部纳入首期范围。
- **关键变更：**
  - `electron/main/agent/tool-executor.ts` — `AgentContext.backgroundTaskIds` 累积
  - `electron/main/agent/agent-loop.ts` — `finishDone` / `finishPending` 返回 ids
  - `electron/main/agent/agent-types.ts` + `src/types/axecoder.d.ts` — 结果与 `ChatMessage.backgroundTaskIds`
  - `electron/main/agent/agent-subagent-tasks.ts` — `resolveBackgroundTasks`、output 文件解析
  - `electron/main/agent-ipc.ts` + `electron/preload/index.ts` — `agent:resolveBackgroundTasks`
  - `src/utils/background-task-state.ts`（新）— 合并 SSE + 轮询状态（可单测）
  - `src/components/workbench/BackgroundTaskCard.vue`（新）
  - `src/components/workbench/ChatPane.vue` — 落盘 ids、渲染卡片、订阅与轮询
- **权衡：**
  - **收益：** 因果清晰、刷新可恢复终态、SSE 丢事件有轮询兜底
  - **风险：** 重启时仍在 running 且无 output 文件的任务只能显示「运行中/未知」；需保证 continue 路径合并新 ids
- **验证：**
  - Vitest：`parseTaskOutputFile`、`resolveBackgroundTasks`、`mergeBackgroundTaskUpdates`
  - 手工：多 Task 后台 → 父回复 → 卡片持续更新 → 刷新后终态仍在
- **待解决问题：**
  - Workshop 消息是否同期支持（本轮 Chat-only）
  - 卡片上「打开 output 文件」快捷操作（可选增强）

### 未采纳方案说明

- **未选：** 提案 1 – 会话级后台任务条
- **原因：** 与触发回复脱节；`loading` 与后台任务状态竞态风险更高；效果与稳定不如消息锚定
