# 主进程瘦身 — 薄网关化

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 主进程仍偏厚，Workshop、CodeGraph、MCP、AI 等堆在主进程；目标对齐「窗口 / 菜单 / 磁盘 / 子进程桥接」薄网关。
- **调研来源：** `docs/deliverables/main-process-thin-gateway/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-main-process-thin-gateway.md`（双方案草稿）
- **选定基础：** 提案 1 – 分层多 Worker
- **用户调整摘要：** 无额外调整

---

### 最终方案 – 分层多 Worker

- **概述：** 延续 `AgentWorkerBridge`、`ExtensionHostBridge` 模式，新增 **Workshop Worker** 与 **Indexer Worker**；主进程 IPC 薄代理。补全 `agent-ipc` 经 `withAgentRuntime` 转发（补齐 main-process-isolation 缺口）。默认 `agentWorkerEnabled=true`、`workshopWorkerEnabled=true`、`indexerWorkerEnabled=true`，可回退主进程内执行。Git、终端 pty、窗口/菜单留主进程；MCP 插件 IPC 本轮仍留主进程（OAuth 需 Electron）。
- **相对选定提案的变更：** MCP 转发延后；Workshop Worker 内嵌运行 `agent-loop`（Workshop 专用 session），与 Chat 侧 Agent Worker 进程分离。
- **关键变更：**
  - `electron/main/workshop-worker/`、`workshop-worker-bridge.ts`、`workshop-worker-process.ts`
  - `electron/main/indexer-worker/`、`indexer-worker-bridge.ts`、`indexer-worker-process.ts`
  - `electron/main/workshop/workshop-send.ts` — 抽取 send 逻辑
  - `electron/main/workshop-runtime-proxy.ts`、`indexer-runtime-proxy.ts`
  - 改造 `workshop-ipc.ts`、`codegraph-ipc.ts`、`agent-ipc.ts`
  - `workshop-progress-emit.ts`、`main-process-delegate.ts` — Workshop Worker 委托
  - `config-store.ts`、`models-types.ts`、`vite.config.ts`、`index.ts`
  - 单测 `UT-workshop-worker`、`UT-indexer-worker`
- **权衡：**
  - ✅ 主进程不再直接跑 Workshop 编排与 CodeGraph 索引
  - ✅ 与既有子进程模式一致
  - ❌ Workshop 与 Chat 各有一份 Agent 运行时（不同 session 域，可接受）
  - ❌ 进程数增加
- **验证：**
  - 单测：protocol、runtime proxy、host-handlers
  - 回归：`npm test` 全绿
- **待解决问题：**
  - MCP IPC 迁入 Agent Worker 或 Sidecar
  - Workshop 与 Agent Worker 统一 session 的跨进程协调
  - Worker 崩溃自动重启（Phase 2）

### 未采纳方案说明

- **未选：** 提案 2 – 单 IDE Sidecar；**原因：** 用户选定提案 1。
- **未选：** 提案 3 – 最小改动；**原因：** 不满足薄网关目标。
