# 调研来源

| 文档/模块 | 说明 |
|-----------|------|
| `docs/deliverables/lsp-unified-architecture/lsp-unified-architecture-交付总结.md` | Extension Host LSP 统一架构；编辑器与 Agent 共用 `LspService` |
| `docs/research/research-agent-tools-matrix.md` §10 | `agentFeatureLsp` 默认关；ReadLints/FixLints 同门禁 |
| `electron/main/config-store.ts:91` | `agentFeatureLsp: raw.agentFeatureLsp ?? false` |
| `electron/main/agent/tool-executor.ts:43-48` | `refreshLspForFile` 仅 `notifyLspFileRefresh` → 编辑器 IPC |
| `electron/main/lsp/lsp-editor-ipc.ts:77-79` | `lsp:refreshFile` 通知 Monaco 同步，不更新主进程 LSP 文档 |
| `electron/main/agent/agent-read-lints.ts` | ReadLints 需 Agent 主动调用；`ensureLspFileOpen` + `textDocument/diagnostic` |
| `src/composables/useMonacoLsp.ts` | 编辑器侧 didOpen/didChange 已接通 |
| `docs/proposals/proposal-agent-lsp-parity.md` | 历史方案：LSP 工具已落地，默认开未做 |

**调研缺口：** 无专门「Agent 编辑后 LSP 同步」设计文档；本轮基于代码现状推导。
