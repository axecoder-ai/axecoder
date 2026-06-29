# LSP 统一架构优化

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 将 LSP 迁入 Extension Host 子进程、对齐 VS Code「装扩展即得语言支持」、合并编辑器与 Agent 双入口为统一 LspBridge。
- **调研来源：** `docs/deliverables/lsp-unified-architecture/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-lsp-unified-architecture.md`（双方案草稿）
- **选定基础：** 提案 1 – Extension Host LSP 中心化（VS Code 语言生态对齐）
- **用户调整摘要：** 无额外调整，按方案原文落地

---

### 最终方案 – Extension Host LSP 中心化

- **概述：** 新增 **Extension Host** 子进程承载 `lsp-server-manager` 与 language server 进程；主进程仅保留 **LspBridge** RPC 网关与统一 **LspService** 门面。Monaco（`lsp-editor-ipc`）与 Agent 工具（`agent-lsp` / `ReadLints` / `FixLints`）均经 `LspService` 调用。语言 server 注册优先来自已安装 VS Code/Cursor 扩展 manifest 扫描，`lsp.json` 降为可选覆盖。
- **相对选定提案的变更：** 无。
- **关键变更：**
  - `electron/main/extension-host/protocol.ts`、`lsp-runner.ts`、`extension-host-process.ts`
  - `electron/main/extension-host-bridge.ts`
  - `electron/main/lsp/lsp-service.ts`（统一门面）
  - `electron/main/lsp/lsp-extension-discovery.ts`
  - 改造 `lsp-config.ts`、`lsp-manager.ts`、`lsp-editor-ipc.ts`
  - `config-store`：`extensionHostLspEnabled`（默认 `true`）
  - `vite.config.ts` 增加 extension-host 构建入口
  - 单测 `tests/unittest/UT-lsp-service/`、`UT-extension-host/`
- **权衡：**
  - ✅ LSP 崩溃隔离；单入口；扩展扫描减少手动配置
  - ❌ 首版以 manifest 扫描 + 既有 JSON-RPC 客户端为主，完整 `vscode-languageclient` shim 分期
  - ❌ 部分扩展内嵌 server 路径需 allowlist 维护
- **验证：** 单测 RPC/发现/门面；无 `lsp.json` 时装有 rust-analyzer 扩展可发现 server；Agent 与 Monaco 共用 Host 文档状态
- **待解决问题：** Companion 模式委托 VS Code 内置 LSP；`.vsix` 侧载；扩展启用/禁用 UI

### 未采纳方案说明

- **未选：** 提案 2（主进程统一 + Manifest 发现）、提案 3（仅统一入口）
- **原因：** 用户选定提案 1，要求 Extension Host 与 VS Code 语言生态对齐。
