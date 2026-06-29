# 调研来源

- 用户 `/rppit` 需求：优化「Agent 57 个工具等业务堆在主进程、隔离性弱」的架构问题。
- 代码库浏览（无独立 research 文档，标注调研缺口）：
  - `electron/main/index.ts` — 主进程入口，21 个 IPC 模块
  - `electron/main/agent/` — 77 个 TS 文件，Agent loop、tool-executor、ext-executor
  - `electron/main/agent-ipc.ts` — Agent IPC 桥
  - `electron/main/terminal-ipc.ts` — pty 子进程桥接（可参考模式）
  - `electron/main/lsp/lsp-client.ts` — LSP spawn 子进程（可参考模式）
  - `electron/main/agent/agent-browser-playwright.ts` — 已有独立 browser-runner 子进程
  - `extensions/axecoder/` — VS Code Companion 扩展，非桌面版扩展宿主
  - `features/功能清单.md` — 架构关系图、扩展面板占位说明
  - `packages/axecoder-core/` — 扩展与主进程共享核心
