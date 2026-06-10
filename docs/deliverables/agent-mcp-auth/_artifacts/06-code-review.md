# 代码审查 — agent-mcp-auth

## 结论：**通过**（无阻塞项）

## 功能

- `McpAuth` 已接入真实 OAuth，与 Settings `mcpPlugins:connect` 共享 `connectMcpPluginOAuth`。
- 内置插件优先于 `findMcpServer`，未启用插件时仍可授权。
- 成功后 `disconnectMcpServer` 避免旧连接无 token。

## 质量

- 逻辑集中在 `agent-mcp-auth.ts`，executor 仅 5 行接线。
- 单测 mock 使用 `importOriginal` 保留 `mergeWithPlugins` 行为。

## 安全

- 无新密钥存储；复用 `~/.axecoder/mcp-oauth.json`（0600）。
- OAuth loopback 与 Settings 相同，无扩大攻击面。

## 非阻塞待办

- 更新 `research-agent-tools-matrix.md` McpAuth 行为描述为「已实现（内置插件 OAuth）」。
- 全量单测中 `bash-integration` 既有失败可另开任务修复。
