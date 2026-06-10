# Agent McpAuth OAuth — 功能实现报告

## 功能说明

- 新增 `authenticateMcpServer(serverName, projectRoot?)`，供 Agent `McpAuth` 工具调用。
- **内置 OAuth 插件**（如 `context7`）：调用 `connectMcpPluginOAuth`，成功后 `setPluginEnabled` 并 `disconnectMcpServer` 刷新连接池。
- **已有 token**：返回 `alreadyAuthenticated`，不重复打开浏览器。
- **headers / stdio / 直连 URL**：返回已配置或无需 OAuth 的说明。
- **未知 server**：返回错误。

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/agent/agent-mcp-auth.ts` | 新建 |
| `electron/main/mcp-plugins-registry.ts` | `getMcpPluginByServerName` |
| `electron/main/agent/agent-ext-executor.ts` | `McpAuth` 接线 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 工具描述 |
| `tests/unittest/UT-agent-mcp-auth/agent-mcp-auth.test.ts` | 单测 |

## 单测覆盖

- OAuth 连接成功路径
- 已有 token 跳过授权
- OAuth 失败
- stdio / headers / 未知 server

## 注意事项

- OAuth 需用户浏览器交互，不适合无人值守子代理。
- 非内置插件的 mcp.json OAuth server 仍无法在 Agent 内自动授权。
