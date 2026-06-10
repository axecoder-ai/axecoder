# FixLints 工具 设计文档

**desired_location:** `docs/plans/plan-fix-lints-tool.md`

## 需求

- FixLints 工具，参数 paths 可选（同 ReadLints）
- LSP codeAction quickfix + source.fixAll
- 应用 WorkspaceEdit 写盘
- 末尾 ReadLints 汇报剩余诊断

## 实施计划

1. `lsp-workspace-edit.ts` — applyTextEdits / applyWorkspaceEdit
2. 抽取 `fetchFileDiagnostics` from read-lints
3. `agent-fix-lints.ts` — 核心逻辑
4. 工具注册 + 单测 UT-fix-lints-tool
