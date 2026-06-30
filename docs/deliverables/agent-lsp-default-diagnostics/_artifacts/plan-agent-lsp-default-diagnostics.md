# Agent LSP 默认开启 + 编辑后自动诊断 — 实施计划

## 当前背景

- Monaco 编辑器经 `useMonacoLsp` + `lsp-editor-ipc` 已接通 LSP。
- Agent 工具 `LSP` / `ReadLints` / `FixLints` 已实现，但 `agentFeatureLsp` 默认 `false`。
- `tool-executor` 写盘后 `refreshLspForFile` 仅 `lsp:refreshFile` 通知 UI，主进程 LSP 文档未 `didChange`。

## 需求

### 功能需求

1. `agentFeatureLsp` 默认 `true`。
2. 新增 `agentLspAutoDiagnostics` 默认 `true`；关闭时不自动附诊断。
3. Write/Edit/ApplyPatch apply 后同步 LSP 文档（读磁盘 → open/change）。
4. 自动诊断开启时，拉取 error/warning 并追加到工具回报。
5. Agent 会话 `startAgentTurn` 时预热 `ensureLspForProject`（best-effort）。

### 非功能需求

- 复用 `LspService` / `fetchFileDiagnostics`；无诊断时不追加块。
- 写盘路径保持最小改动。

## 设计决策

### 1. 同步层

新增 `lsp-agent-sync.ts`，维护 agent 侧 document version，调用 `getLspServerManager().openFile/changeFile`。

### 2. 诊断附带

新增 `agent-lsp-post-edit.ts`，复用 `fetchFileDiagnostics` + `formatDiagnosticsResult`，仅输出含 error/warning 的文件。

## 技术设计

### 文件变更

| 文件 | 操作 |
|------|------|
| `electron/main/config-store.ts` | 修改默认值 |
| `electron/main/models-types.ts` | 新配置项 |
| `electron/main/lsp/lsp-agent-sync.ts` | 新增 |
| `electron/main/agent/agent-lsp-post-edit.ts` | 新增 |
| `electron/main/agent/tool-executor.ts` | 写盘后 sync + 诊断 |
| `electron/main/agent/agent-loop.ts` | 会话预热 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 文案 |
| `tests/unittest/UT-agent-lsp-post-edit/` | 新增单测 |

## 实施计划

1. **阶段一：** 配置默认 + `lsp-agent-sync` + 单测
2. **阶段二：** `agent-lsp-post-edit` + `tool-executor` 集成 + 单测
3. **阶段三：** `agent-loop` 预热 + 跑全量相关单测

## 测试策略

- `UT-agent-lsp-post-edit`：有/无诊断、配置关闭、多文件
- 复跑 `UT-read-lints-tool`、`UT-agent-lsp`
