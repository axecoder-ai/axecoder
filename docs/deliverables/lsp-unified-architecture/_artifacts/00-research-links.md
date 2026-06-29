# 调研链接

- 代码：`electron/main/lsp/`（lsp-manager、lsp-server-manager、lsp-editor-ipc、lsp-config）
- 代码：`electron/main/agent/agent-lsp.ts`、`agent-read-lints.ts`、`agent-fix-lints.ts`
- 代码：`src/composables/useMonacoLsp.ts`
- 代码：`extensions/axecoder/src/host/vscode-host.ts`（无 LSP 集成）
- 配置示例：`resources/lsp.json.example`
- 上游提案：`docs/proposals/proposal-agent-lsp-parity.md`（已确认，Agent 工具 parity）
- 相关提案：`docs/proposals/proposal-workbench-contributions.md`（Extension Host Bridge）
- 相关提案：`docs/proposals/proposal-main-process-isolation.md`（Agent Worker 已落地）
- 功能清单：`features/功能清单.md` §5.1 LSP

**调研缺口：** 无专门 LSP 架构调研文档；Extension Host 尚无实现，仅 workbench-contributions 提案中有设计草图。
