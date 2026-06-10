# FixLints 工具 功能实现报告

## 功能说明

新增 **FixLints** Agent 工具，对齐 Cursor `FIX_LINTS`：

1. 对目标文件拉取 LSP 诊断（复用 ReadLints）
2. `textDocument/codeAction` 获取 quickfix / source.fixAll
3. 应用 `WorkspaceEdit` 写回磁盘
4. 末尾再跑 ReadLints 汇报剩余问题

## 修改文件列表

| 文件 | 变更 |
|------|------|
| `electron/main/agent/agent-fix-lints.ts` | 新建 |
| `electron/main/lsp/lsp-workspace-edit.ts` | 新建 |
| `electron/main/agent/agent-read-lints.ts` | 抽取共享诊断 API |
| `electron/main/agent/agent-types.ts` | FixLints |
| `electron/main/agent/agent-tool-prompts-ext.ts` | schema |
| `electron/main/agent/agent-ext-executor.ts` | 执行 + plan 禁止 |
| `tests/unittest/UT-fix-lints-tool/` | 单测 |

## 注意事项

- 依赖 LSP codeAction 能力；纯 tsc 类型错误多数无法 auto-fix
- Plan 模式禁止；需 `agentFeatureLsp`
- 非只读工具（直接写盘）
