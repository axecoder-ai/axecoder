# Agent Bash 契约对齐 — 实施计划

**desired_location:** `docs/plans/plan-agent-bash-parity.md`

## 当前背景

- `agent-bash.ts` 单次 spawn，`timeout_ms`，无 `description` / `run_in_background`。
- `TaskOutput` 仅服务子代理 `agent-subagent-tasks.ts`。
- 提示词写明「无 background job UI」，与 CC 不符。

## 需求

### 功能需求

1. Bash schema：`command`（必填）、`timeout`（ms，默认 120000，最大 600000）、`description`（可选）、`run_in_background`（可选）；executor 兼容 `timeout_ms`。
2. 前台：批准后 `runAgentBash`，输出格式不变。
3. 后台：`run_in_background` 批准后 `startBackgroundBash`，立即返回 task id；`TaskOutput` 可读 stdout/stderr 与状态。
4. 更新 `BASH_DESCRIPTION`（专用工具优先、git 安全、background + TaskOutput）。
5. UI：`PendingBash` 展示 `description`。

### 非功能需求

- macOS/Linux 首版验证；Windows 不阻塞发布。
- 后台任务输出上限与前台一致（200k 截断）。

## 设计决策

1. **不引入持久 shell** — 与用户选定提案 2 一致。
2. **独立 `agent-bash-tasks.ts`** — 与子代理任务分表，`TaskOutput` 先查 subagent 再查 shell。
3. **仍走 bash_pending 批准流** — 与现有权限模型一致。

## 实施计划

### 阶段 1：单测（TDD）

1. 新建 `UT-agent-bash-parity`：`parseBashTimeout`、`run_in_background` 注册、后台任务完成、`TaskOutput` 合并。

### 阶段 2：主进程

1. `agent-bash-tasks.ts` — 后台 spawn、累积输出、状态。
2. `agent-bash.ts` — `parseBashTimeoutMs`、`formatBackgroundBashStarted`。
3. `tool-executor.ts` — 新参数、apply 分支。
4. `agent-ext-executor.ts` — TaskOutput 查 shell task。
5. `agent-tool-prompts.ts` — schema + description。

### 阶段 3：前端类型与 UI

1. `axecoder.d.ts`、`PendingBashPublic`、`ChatBashCard.vue`。

### 阶段 4：验收

1. `npm test` 全绿；落盘 `05-implement-report.md`、`05-unittest.md`。

## 文件变更清单

| 路径 | 操作 |
|------|------|
| `electron/main/agent/agent-bash-tasks.ts` | 新增 |
| `electron/main/agent/agent-bash.ts` | 修改 |
| `electron/main/agent/agent-tool-prompts.ts` | 修改 |
| `electron/main/agent/tool-executor.ts` | 修改 |
| `electron/main/agent/agent-ext-executor.ts` | 修改 |
| `electron/main/agent/agent-types.ts` | 修改 |
| `electron/main/agent/agent-session-store.ts` | 修改 |
| `src/types/axecoder.d.ts` | 修改 |
| `src/components/workbench/ChatBashCard.vue` | 修改 |
| `tests/unittest/UT-agent-bash-parity/*` | 新增 |
