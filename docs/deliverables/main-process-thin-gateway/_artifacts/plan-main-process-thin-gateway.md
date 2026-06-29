# 主进程瘦身 — 薄网关化 设计文档

## 当前背景

- `electron/main/` 约 458 个 TS 文件；`index.ts` 注册 21 个 IPC 模块。
- Agent Worker、Extension Host LSP 基础设施已存在，但 `agent-ipc` 未接 bridge，`agentWorkerEnabled` 默认 `false`。
- Workshop、`codegraph/` 仍在主进程事件循环。

## 需求

### 功能需求

- 默认启用 Agent Worker；`agent-ipc` 运行时方法经 bridge 转发。
- Indexer Worker 承载 `codegraph:status` / `codegraph:index` / `maybeAutoIndexCodeGraph`。
- Workshop Worker 承载 `workshop:*` 运行时（session CRUD、send、stop）。
- 主进程保留窗口、菜单、FS、终端、Git、MCP（OAuth）、各 Bridge。
- 配置项可关闭各 Worker 回退主进程。

### 非功能需求

- 渲染进程 IPC channel 不变。
- 复用 JSON 行 RPC（与 agent-worker 同协议形状）。
- 退出时 shutdown 全部 bridge。

## 设计决策

### 1. 进程模型

`fork` + `ELECTRON_RUN_AS_NODE`；Workshop Worker 设 `AXECODER_WORKSHOP_WORKER=1`，内嵌 `agent-loop`（Workshop session 专用）。

### 2. 协议复用

Workshop/Indexer bridge 复用 `agent-worker/protocol.ts` 类型与编解码。

### 3. 主进程委托

Workshop Worker host-handlers：`emitWorkshopProgress`、`emitProgress`、`notifyLspFileRefresh`、`traceToolCall`、`traceToolResult`。

## 实施计划

### 阶段一（本轮）

1. `agentWorkerEnabled` 默认 `true`；`agent-ipc` 接 `withAgentRuntime`
2. Indexer Worker + `codegraph-ipc` 代理
3. Workshop Worker + `workshop-send` 抽取 + `workshop-ipc` 代理
4. vite 双入口、index 退出清理
5. 单测 + 全量回归

### 阶段二（后续）

- MCP IPC 转发
- Worker 崩溃监督重启
- `packages/` 物理搬迁

## 测试策略

- `UT-indexer-worker`：protocol、proxy 回退
- `UT-workshop-worker`：protocol、host-handlers、proxy 回退
- 扩展 `UT-agent-worker`：确认默认 enabled
- `npm test` 全绿

## 文件变更

| 文件 | 类型 |
|------|------|
| `electron/main/indexer-worker/*` | 新增 |
| `electron/main/workshop-worker/*` | 新增 |
| `electron/main/*-worker-bridge.ts` | 新增 |
| `electron/main/*-worker-process.ts` | 新增 |
| `electron/main/*-runtime-proxy.ts` | 新增 |
| `electron/main/workshop/workshop-send.ts` | 新增 |
| `electron/main/workshop-ipc.ts` | 修改 |
| `electron/main/codegraph-ipc.ts` | 修改 |
| `electron/main/agent-ipc.ts` | 修改 |
| `electron/main/config-store.ts` | 修改 |
| `electron/main/index.ts` | 修改 |
| `vite.config.ts` | 修改 |
