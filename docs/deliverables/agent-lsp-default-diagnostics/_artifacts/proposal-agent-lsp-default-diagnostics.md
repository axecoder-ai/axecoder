# Agent LSP 默认开启 + 编辑后自动诊断 — 已确认方案

**状态：** 已确认

**日期：** 2026-06-30

---

## 已确认解决方案提案

**上下文：**
- **请求：** 编辑器 LSP 已接通，Agent 链未默认接通；需在 Agent 写盘后同步 LSP 并自动附带诊断。
- **调研来源：** `00-research-links.md`；`lsp-unified-architecture` 交付总结
- **选定基础：** 提案 2 – 默认开启 + 同步 + 编辑工具自动附带诊断摘要
- **用户调整摘要：** 无额外调整

### 最终方案 – 默认开启 + 同步 + 编辑后自动诊断

- **概述：** `agentFeatureLsp` 与 `agentLspAutoDiagnostics` 默认 `true`。Write/Edit/ApplyPatch 落盘后调用 `syncAgentFileToLsp` 更新 LSP 文档，并按需拉取 `textDocument/diagnostic` 追加到工具回报。保留 `notifyLspFileRefresh` 给 Monaco。Agent 会话启动时若 LSP 功能开启则 `ensureLspForProject` 预热。
- **关键变更：**
  - `config-store.ts`、`models-types.ts`：默认值与新配置项
  - `lsp-agent-sync.ts`：主进程 LSP 文档同步
  - `agent-lsp-post-edit.ts`：诊断摘要拼装
  - `tool-executor.ts`：写盘 apply 后调用
  - `agent-loop.ts`：会话预热
  - `agent-tool-prompts-ext.ts`：更新文案
- **权衡：** 每次写入多一次 LSP 往返；诊断块可能增加 token，无诊断时不追加。
- **验证：** 单测覆盖 sync、post-edit 诊断、配置默认；现有 LSP/ReadLints 单测仍绿。
- **待解决问题：** 设置页 UI toggle（可选后续）；极慢 language server 时的超时策略。

### 未采纳方案说明

- **未选：** 提案 1（仅同步、不自动附诊断）
- **原因：** 不满足「编辑后自动喂诊断」需求。
