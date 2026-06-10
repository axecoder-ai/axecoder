# ReadLints 工具 功能实现报告

## 功能说明

新增 Agent 工具 **ReadLints**，对齐 Cursor `READ_LINTS`：

- 参数 `paths?: string[]`（可选；省略时自动扫描最多 30 个常见源码文件）
- 经 LSP `textDocument/diagnostic` 拉取诊断
- 输出格式：`path:line:col severity [code]: message (source)`
- 受 `agentFeatureLsp` 开关控制；归类为只读工具

## 修改文件列表

| 文件 | 变更 |
|------|------|
| `electron/main/agent/agent-types.ts` | 新增 `ReadLints` 工具名 |
| `electron/main/agent/agent-read-lints.ts` | 新建：解析、文件解析、LSP 调用 |
| `electron/main/lsp/lsp-formatters.ts` | `formatDiagnosticsResult` |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 工具 schema |
| `electron/main/agent/agent-ext-executor.ts` | 执行分发 |
| `electron/main/agent/agent-permissions.ts` | READ_ONLY_TOOLS |
| `tests/unittest/UT-read-lints-tool/read-lints-tool.test.ts` | 单测 |

## 单测覆盖

- `parseReadLintsInput`：数组、单 path、省略 paths
- `formatDiagnosticsResult`：有/无诊断
- `buildFullAgentTools` 含 ReadLints
- `executeExtendedAgentTool` mock LSP 集成

## 注意事项

- 依赖 `~/.axecoder/lsp.json` 或 `.axecoder/lsp.json` 配置 LSP 服务
- 无 LSP 时返回「no LSP server for .ext」提示，非 IDE marker 直连
- 后续可加 tsc/eslint CLI 兜底
