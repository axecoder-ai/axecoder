# Agent McpAuth OAuth 接线

**状态：** 已确认

## 上下文

- **请求：** 将 Agent `McpAuth` 工具从说明性 stub 接到已有 OAuth 基础设施（`mcp-oauth-connect`、Settings MCP Connect）。
- **调研来源：** `docs/research/research-agent-tools-matrix.md`、`docs/deliverables/agent-mcp-runtime/_artifacts/05-implement-report.md`

## 已确认方案 — 复用 Settings OAuth 管线

### 概述

新增 `authenticateMcpServer`，在 Agent 调用 `McpAuth` 时：对内置 OAuth 插件（如 context7）触发与 Settings「连接」相同的 `connectMcpPluginOAuth` 流程；对已配置 API Key / stdio server 返回明确状态；成功后断开连接池以便 `CallMcpTool` 使用新 token。

### 关键变更

| 模块 | 变更 |
|------|------|
| `electron/main/agent/agent-mcp-auth.ts` | 新建认证逻辑 |
| `electron/main/mcp-plugins-registry.ts` | `getMcpPluginByServerName` |
| `electron/main/agent/agent-ext-executor.ts` | `McpAuth` 接线 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 工具描述更新 |
| `tests/unittest/UT-agent-mcp-auth/` | 单测 |

### 不在范围

- 任意 `mcp.json` 自定义 server 的通用 OAuth（无插件元数据时无法自动授权）
- Renderer 内嵌 OAuth UI（继续用系统浏览器 + loopback callback）

### 验证

- `UT-agent-mcp-auth`：OAuth 成功/失败/已连接、stdio、headers、未知 server
- 手工：Agent 调用 `McpAuth` + `CallMcpTool` on context7

### 待解决问题

- 非内置 OAuth MCP 需用户在 Cursor/AxeCoder Settings 手动配置
- OAuth 授权需用户交互，Agent 后台子代理无法无人值守完成
