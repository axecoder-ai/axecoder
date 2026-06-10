# FixLints 工具 — 已确认方案

**状态：** 已确认

**日期：** 2025-06-10

---

## 最终方案 – LSP codeAction 自动应用

- **概述：** `FixLints({ paths?: string[] })` — 拉诊断 → `textDocument/codeAction` → 应用 `WorkspaceEdit` → ReadLints 验证汇报。
- **关键变更：** `agent-fix-lints.ts`、`lsp-workspace-edit.ts`、共享 `agent-read-lints.ts` 诊断、工具注册、单测。
- **门禁：** `agentFeatureLsp`；Plan 模式禁止；非只读工具。
