# 实现报告 — agent-lsp-parity

## 概要

将 Claude Code `LSPTool` 对齐到 AxeCoder Agent：9 种 operation、1-based 行列、结果格式化、gitignore 过滤、按扩展名路由 LSP 进程。

## 新增/修改

| 路径 | 说明 |
|------|------|
| `electron/main/lsp/*` | LSP 客户端、实例、manager、配置加载、formatters |
| `electron/main/agent/agent-lsp.ts` | 工具执行入口 |
| `electron/main/agent/agent-lsp-prompt.ts` | 工具 description（CC 文案） |
| `electron/main/agent/agent-lsp-gitignore.ts` | `git check-ignore` 过滤 |
| `electron/main/agent/agent-ext-executor.ts` | 替换 stub |
| `electron/main/agent/agent-tool-prompts-ext.ts` | `filePath` + operation enum |
| `resources/lsp.json.example` | 配置示例 |
| `package.json` | `vscode-jsonrpc` 等依赖 |
| `tests/unittest/UT-agent-lsp/` | 解析与配置单测 |

## 使用

1. 设置 `agentFeatureLsp: true`（`~/.axecoder/config.json` 或应用配置）。
2. 复制 `resources/lsp.json.example` → `~/.axecoder/lsp.json`（或项目 `.axecoder/lsp.json`）。
3. 本机安装对应 language server（如 `typescript-language-server`）。
4. Agent 调用 `LSP` 工具，`filePath` 为项目内相对/绝对路径。

## 与 CC 差异

- 配置来自 **axecoder lsp.json**，非 CC 插件 LSP。
- 工具仅在 `agentFeatureLsp` 开启时可用（CC 为 `isLspConnected()` 动态启用）。
