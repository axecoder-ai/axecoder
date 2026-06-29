# 功能实现报告 — main-process-isolation

## 功能说明

将 **Agent 运行时**迁入独立子进程（Agent Worker），主进程通过 JSON 行 RPC 代理 `agent:send`、审批续跑、session 列表等 IPC；Worker 经反向 RPC 将 `agent:progress`、LSP 刷新、AI Trace 委托回主进程广播。

- 配置 `agentWorkerEnabled`（默认 `true`），设为 `false` 可回退主进程内执行。
- 退出应用时 `shutdownAgentWorkerBridge()` 清理子进程。

## 修改文件列表

| 文件 | 说明 |
|------|------|
| `electron/main/agent-worker/protocol.ts` | RPC 协议 |
| `electron/main/agent-worker/runner.ts` | Worker 侧方法分发 |
| `electron/main/agent-worker/host-handlers.ts` | 主进程反向 RPC 处理 |
| `electron/main/agent-worker-process.ts` | Worker 入口 |
| `electron/main/agent-worker-bridge.ts` | 主进程 bridge |
| `electron/main/agent-runtime-proxy.ts` | `withAgentRuntime` 代理 |
| `electron/main/agent/main-process-delegate.ts` | Worker 模式委托 |
| `electron/main/agent-ipc.ts` | 运行时 IPC 走 bridge |
| `electron/main/agent/agent-progress-emit.ts` | 进度委托 |
| `electron/main/agent/tool-executor.ts` | LSP 刷新委托 |
| `electron/main/agent/agent-loop.ts` | Trace 委托；`turnFileChanges` 空值防护 |
| `electron/main/config-store.ts` | `agentWorkerEnabled` |
| `electron/main/models-types.ts` | 类型 |
| `electron/main/index.ts` | 退出时 shutdown worker |
| `vite.config.ts` | 构建 `agent-worker-process` 第二入口 |
| `tests/unittest/UT-agent-worker/agent-worker.test.ts` | 新增单测 |

## 单测覆盖

- protocol 编解码与白名单 type
- host-handlers 未知方法
- main-process-delegate 环境变量
- withAgentRuntime 禁用 worker 时走 local

## 注意事项

1. **Workshop** 仍通过 `runWorkshopRoleAgentTurn` 在主进程调用（`workshop-agent-speaker.ts`），未纳入 Worker；后续应增加 `workshopRoleTurn` RPC。
2. Worker 崩溃后 bridge 会 reject 进行中的 call，**自动重启**尚未实现（计划 Phase 2）。
3. 开发模式需 Vite 构建产出 `dist-electron/main/agent-worker-process.js` 后 fork 才可用。
