# 功能实现报告

## 功能说明

1. **`agentFeatureLsp` 默认 `true`**：`LSP` / `ReadLints` / `FixLints` 开箱可用。
2. **`agentLspAutoDiagnostics` 默认 `true`**：Write/Edit/ApplyPatch 成功后自动附带 error/warning 诊断摘要。
3. **`lsp-agent-sync.ts`**：Agent 写盘后向主进程 LSP 发送 `didOpen`/`didChange`。
4. **`agent-lsp-post-edit.ts`**：拼装 `--- LSP diagnostics ---` 块。
5. **`tool-executor.ts`**：`finishAgentFileWrites` 统一 sync + notify + 诊断；Worker 经 `afterAgentFileWrite` 委托主进程。
6. **`agent-loop.ts`**：会话启动时 `ensureLspForProject` 预热。

## 修改文件列表

| 文件 | 类型 |
|------|------|
| `electron/main/config-store.ts` | 修改 |
| `electron/main/models-types.ts` | 修改 |
| `electron/main/lsp/lsp-agent-sync.ts` | 新增 |
| `electron/main/agent/agent-lsp-post-edit.ts` | 新增 |
| `electron/main/agent/tool-executor.ts` | 修改 |
| `electron/main/agent/agent-loop.ts` | 修改 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 修改 |
| `electron/main/agent/main-process-delegate.ts` | 修改 |
| `electron/main/agent-worker/protocol.ts` | 修改 |
| `electron/main/agent-worker/runner.ts` | 修改 |
| `electron/main/agent-worker-bridge.ts` | 修改 |
| `electron/main/agent-worker/host-handlers.ts` | 修改 |
| `tests/unittest/UT-agent-lsp-post-edit/agent-lsp-post-edit.test.ts` | 新增 |

## 单测覆盖

- post-edit：配置关闭、有 error、仅 info/hint 过滤
- lsp-agent-sync：open vs change 分支

## 注意事项

- Worker 路径依赖 `hostRes.result` 回传诊断块。
- 设置页尚无 `agentLspAutoDiagnostics` UI，仅 config.json。
