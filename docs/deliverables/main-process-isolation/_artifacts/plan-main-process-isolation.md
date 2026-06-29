# main-process-isolation Design Document

## Background

- AxeCoder 采用 Electron 主进程 + Vue 渲染进程；Agent 全链路（`agent-loop`、57 工具、MCP、CodeGraph）当前在 `electron/main/agent/`（77 TS 文件）与主进程同事件循环。
- 终端（`node-pty`）、LSP（`spawn`）、`browser-runner` 已是子进程桥接模式；Agent 是主要隔离缺口。
- 用户选定提案 2：独立 Agent Worker，主进程薄网关。

## Requirements

### Functional

- Agent Worker 进程执行：`startAgentTurn`、`stopAgentTurn`、Write/Bash/Plan 审批续跑、checkpoint rewind 等 loop 相关 IPC。
- 主进程 `agent-ipc.ts` 对渲染进程 API 不变。
- Worker → 主进程反向 RPC：`agent:progress` 广播、`notifyLspFileRefresh`、AI Trace 埋点。
- Worker 崩溃后主进程可重启 Worker；进行中的 session 返回明确错误或可恢复策略。
- 配置项 `agentWorkerEnabled` 可关闭回退主进程内执行（应急）。

### Non-functional

- 单 Worker 进程默认服务多 session（与现 Map 语义一致）。
- RPC 使用 JSON 行协议（与 `browser-runner` 一致），避免引入新依赖。
- 单元测试覆盖 protocol 与 bridge，不依赖真实 Electron 窗口。

## Design Decisions

### 1. 进程模型

使用 `child_process.fork` + `ELECTRON_RUN_AS_NODE=1`，Worker 入口 `dist-electron/agent-worker/index.js`。

理由：与现有 `browser-runner` 一致；比 `utilityProcess` 改动小；Worker 可 `import` 现有 agent 模块。

### 2. 代码布局

不物理搬迁 `electron/main/agent/`；Worker 入口 `import` 同目录模块。运行时隔离优先于目录重组。

### 3. 主进程能力委托

`main-process-delegate.ts` 在 Worker 内将 progress/LSP/trace 转为反向 RPC；主进程 `host-handlers.ts` 调用现有 `broadcastToRenderers`、`notifyLspFileRefresh`、`traceToolCall`。

## Technical Design

### Core Components

- `AgentWorkerBridge`（主进程）：`ensureWorker()`、`call(method, params)`、`onNotification`
- `agent-worker/index.ts`（Worker）：stdin 读 JSON → dispatch → stdout 写 JSON
- `AGENT_WORKER_METHODS`：send, stop, confirmWrite, …（与 agent-loop 导出对齐）

### Integration Points

```
Renderer --IPC--> agent-ipc --RPC--> Agent Worker
                      ^                    |
                      |---- host RPC ------|
                 progress / LSP / trace
```

### File Changes

| 文件 | 操作 |
|------|------|
| `electron/agent-worker/index.ts` | 新增 |
| `electron/main/agent-worker/protocol.ts` | 新增 |
| `electron/main/agent-worker-bridge.ts` | 新增 |
| `electron/main/agent-worker/host-handlers.ts` | 新增 |
| `electron/main/agent/main-process-delegate.ts` | 新增 |
| `electron/main/agent-progress-emit.ts` | 修改 |
| `electron/main/agent/tool-executor.ts` | 修改 |
| `electron/main/agent/agent-loop.ts` | 修改 |
| `electron/main/agent-ipc.ts` | 修改 |
| `electron/main/index.ts` | 注册 bridge 生命周期 |
| `electron/main/config-store.ts` | 新增配置 |
| `vite.config.ts` | 第二入口 |
| `tests/unittest/UT-agent-worker/*.test.ts` | 新增 |

## Implementation Plan

### Phase 1: 协议与桥接（本次）

1. 定义 `protocol.ts`（request/response/notification/hostRequest）
2. 实现 `agent-worker/index.ts` 与 `agent-worker-bridge.ts`
3. 实现 `host-handlers.ts` + `main-process-delegate.ts`
4. 代理 `agent:send`、`agent:stop` 及全部 confirm/reject/answer/plan IPC
5. vite 第二入口 + 路径解析
6. 单测 + 全量 vitest

### Phase 2: 监督与恢复（后续）

- Worker 崩溃自动重启、session 错误提示
- 健康检查 `agent:ping`

### Phase 3: 目录整理（可选）

- 迁至 `packages/agent-runtime/`

## Testing Strategy

### Unit Tests

- protocol 行解析、畸形行容错
- bridge mock stdin/stdout 往返
- delegate 在 worker 模式下发 hostRequest

### Integration Tests

- fork 真实 worker 子进程执行 `ping`
- （可选）mock model 的 send 冒烟

## Observability

- Worker stderr 打 `[agent-worker]` 前缀日志
- 主进程记录 worker exit code 与重启次数

## Security

- Worker 继承项目根 cwd 与 env；不扩大 secrets 暴露面（与现主进程 Agent 相同）
- `agentWorkerEnabled=false` 可回退

## Release Strategy

1. 默认 `agentWorkerEnabled: true`
2. 全量单测通过后合并
3. 手工验证 Chat 发消息 + 工具进度 + Write 审批

## References

- `electron/main/agent/agent-browser-playwright.ts` — JSON 行子进程模式
- `docs/proposals/proposal-main-process-isolation.md`
