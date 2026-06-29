# 功能实现报告 — main-process-thin-gateway

## 功能说明

主进程收敛为薄 IPC 网关，重业务迁入子进程：

1. **Agent Worker（补齐）**：`agent-ipc` 运行时方法经 `withAgentRuntime` 转发；默认 `agentWorkerEnabled=true`。
2. **Indexer Worker**：CodeGraph `status` / `index` / 自动索引迁入独立子进程。
3. **Workshop Worker**：`workshop:*` session 与 send/stop 迁入独立子进程；进度与 Agent 委托经 host RPC 回主进程广播。
4. 退出时 shutdown Agent / Workshop / Indexer / Extension Host bridge。

配置项：`workshopWorkerEnabled`、`indexerWorkerEnabled`（默认 true，可回退主进程）。

## 修改文件列表

| 文件 | 说明 |
|------|------|
| `electron/main/indexer-worker/runner.ts` | Indexer RPC 分发 |
| `electron/main/indexer-worker-process.ts` | Indexer 入口 |
| `electron/main/indexer-worker-bridge.ts` | 主进程 bridge |
| `electron/main/indexer-runtime-proxy.ts` | `withIndexerRuntime` |
| `electron/main/workshop-worker/*` | Workshop Worker |
| `electron/main/workshop-worker-process.ts` | Workshop 入口 |
| `electron/main/workshop-worker-bridge.ts` | 主进程 bridge |
| `electron/main/workshop-runtime-proxy.ts` | `withWorkshopRuntime` |
| `electron/main/workshop/workshop-send.ts` | 抽取 send 逻辑 |
| `electron/main/workshop/workshop-progress-emit.ts` | Worker 委托 |
| `electron/main/workshop-ipc.ts` | 薄代理 |
| `electron/main/codegraph-ipc.ts` | 薄代理 |
| `electron/main/agent-ipc.ts` | Agent 运行时薄代理 |
| `electron/main/agent/main-process-delegate.ts` | Workshop Worker 共用 Agent 委托 |
| `electron/main/config-store.ts` | 默认值与新配置项 |
| `electron/main/models-types.ts` | 类型 |
| `electron/main/index.ts` | 退出清理 |
| `vite.config.ts` | 双 worker 构建入口 |
| `tests/unittest/UT-indexer-worker/` | 新增 |
| `tests/unittest/UT-workshop-worker/` | 新增 |

## 单测覆盖

- protocol 编解码
- runtime proxy 禁用 worker 时走 local
- workshop host-handlers
- workshop main-process-delegate 环境变量

## 注意事项

1. MCP 插件 IPC 仍留主进程（OAuth 需 Electron）。
2. Workshop Worker 内嵌 `agent-loop`（Workshop session），与 Chat 侧 Agent Worker 分离。
3. 开发模式需 Vite 构建产出 `workshop-worker-process.js`、`indexer-worker-process.js`。
