# ReadLints 工具 — 已确认方案

**状态：** 已确认

**日期：** 2025-06-10

---

## 已确认解决方案提案

**上下文：**

- **请求：** 新增 ReadLints Agent 工具，对齐 Cursor READ_LINTS，读取 LSP 诊断。
- **调研来源：** `research-agent-tools-matrix.md` §10/§17、`agent-lsp.ts`、`lsp-server-manager.ts`
- **选定基础：** 提案 1 – 独立 ReadLints 工具（Cursor 命名对齐）
- **用户调整摘要：** 无额外调整

### 最终方案 – 独立 ReadLints 工具

- **概述：** 新增 `ReadLints({ paths?: string[] })` 扩展工具，经 LSP `textDocument/diagnostic` 拉取诊断并格式化输出。受 `agentFeatureLsp` 控制。`paths` 省略时限量自动发现源码文件（最多 30 个）。
- **关键变更：**
  - `agent-types.ts` — `ReadLints`
  - `agent-read-lints.ts`（新）
  - `lsp-formatters.ts` — `formatDiagnosticsResult`
  - `agent-tool-prompts-ext.ts` / `agent-ext-executor.ts`
  - `agent-permissions.ts` — 只读工具集
  - `UT-read-lints-tool`
- **验证：** 单测 + 全量 vitest
- **待解决问题：** 无 LSP 配置时的 tsc 兜底（后续）

### 未采纳方案说明

- **未选：** 扩展 LSP getDiagnostics — 与 Cursor 命名不对齐
