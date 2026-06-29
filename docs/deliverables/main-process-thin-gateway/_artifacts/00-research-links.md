# 调研来源

- 用户 `/rppit` 需求：主进程仍偏厚（`electron/main/` 458 个 TS 文件），Workshop、CodeGraph、MCP、Git、AI 等堆在主进程，目标对齐「主进程只管窗口/菜单/磁盘/子进程桥接」。
- 上游交付（已完成）：
  - `docs/deliverables/main-process-isolation/` — Agent Worker 子进程 + `agentWorkerEnabled`（实现默认 `false`）
  - `docs/deliverables/lsp-unified-architecture/` — Extension Host 承载 LSP + `extensionHostLspEnabled`（默认 `true`）
- 代码库浏览（无独立 research 文档，标注调研缺口）：
  - `electron/main/index.ts` — 21 个 IPC 注册模块
  - `electron/main/workshop-ipc.ts`、`workshop/`、`sop/`、`coordinator/`、`draw-io/` — Workshop 编排
  - `electron/main/codegraph-ipc.ts`、`codegraph/` — 索引与 Agent 工具
  - `electron/main/ai-ipc.ts`、`ai/` — LLM 直连（Chat / Workshop 共用）
  - `electron/main/mcp-plugins-ipc.ts`、`agent/agent-mcp.ts` — MCP 插件
  - `electron/main/git-ipc.ts`、`git-forge/` — Git SCM
  - `electron/main/agent-worker-bridge.ts`、`agent-runtime-proxy.ts` — 已有 Worker 桥接模式
  - `electron/main/extension-host-bridge.ts` — Extension Host 桥接模式
  - `electron/main/terminal-ipc.ts` — pty 桥接（宜留主进程）
  - `features/功能清单.md` — 架构关系图（仍描绘 Agent 在主进程）
