# 主进程业务隔离优化

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 优化 AxeCoder 主进程承载过多 Agent 业务（57 个工具、loop、MCP、CodeGraph 等）导致的隔离性弱问题，将 Agent 运行时迁入独立子进程，主进程做薄 IPC 网关。
- **调研来源：** `docs/deliverables/main-process-isolation/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-main-process-isolation.md`（双方案草稿）
- **选定基础：** 提案 2 – 独立 Agent Worker 进程（整包 Agent Runtime 外移）
- **用户调整摘要：** 无额外调整，按方案原文落地

---

### 最终方案 – 独立 Agent Worker 进程

- **概述：** 新增 **Agent Worker** 子进程（`fork` + `ELECTRON_RUN_AS_NODE`），承载 `agent-loop`、会话状态、57 工具执行；主进程保留窗口、FS/Git/LSP/终端 IDE 能力，通过 JSON 行 RPC 代理 `agent:*` 运行时调用。Worker 经反向 RPC 请求主进程转发 `agent:progress`、LSP 文件刷新、AI Trace 等需触达渲染进程或主进程模块的操作。
- **相对选定提案的变更：** 无（用户未调整）。实现上采用「代码仍位于 `electron/main/agent/`，Worker 为第二入口进程」策略，避免一次性物理搬迁 77 文件，但运行时边界与提案 2 一致。
- **关键变更：**
  - `electron/agent-worker/index.ts` — Worker 入口与 RPC 分发
  - `electron/main/agent-worker/protocol.ts` — 请求/响应/通知类型
  - `electron/main/agent-worker-bridge.ts` — 主进程侧进程管理与 RPC 客户端
  - `electron/main/agent-worker/host-handlers.ts` — Worker 反向 RPC 处理（progress、LSP、trace）
  - `electron/main/agent/main-process-delegate.ts` — Worker 模式下委托主进程能力
  - 改造 `agent-progress-emit.ts`、`tool-executor.ts`（LSP 刷新）、`agent-loop.ts`（trace 委托）
  - 瘦身 `agent-ipc.ts`：运行时方法经 bridge 转发
  - `vite.config.ts` — 增加 agent-worker 构建入口
  - `electron/main/config-store.ts` — `agentWorkerEnabled`（默认 `true`）
  - 单测 `tests/unittest/UT-agent-worker/`
- **权衡：**
  - ✅ Agent 崩溃不拖垮 Electron 主进程；可监督重启
  - ✅ 渲染进程调用路径不变（`agent:send` 等）
  - ❌ RPC 序列化开销；调试跨进程更复杂
  - ❌ 仍非 VS Code Extension Host，第三方插件需 MCP 或后续 EH
- **验证：**
  - 单测：protocol 编解码、bridge 请求/通知、host-handlers
  - 集成：worker 内 `startAgentTurn` 往返；kill worker 后 bridge 重启
  - 回归：`tests/unittest/UT-agent-*` 全绿
- **待解决问题：**
  - Worker 与 Workshop 并行 session 的资源上限
  - 打包后 `dist-electron/agent-worker/index.js` 路径解析
  - 长期是否将 `electron/main/agent/` 物理迁至 `packages/agent-runtime/`

### 未采纳方案说明

- **未选：** 提案 1 – 分层渐进 Tool Worker
- **原因：** 用户明确选定提案 2，追求整包 Agent Runtime 隔离而非仅重型工具外移。
