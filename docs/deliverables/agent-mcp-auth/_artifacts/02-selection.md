# 选型记录 — agent-mcp-auth

## 一句话需求

将 Agent `McpAuth` 从说明性 stub 升级为可触发真实 OAuth 的工具，复用 Settings 已有 `connectMcpPluginOAuth` 能力。

## 方案对比

| 维度 | 提案 1 复用 OAuth 管线 | 提案 2 仅增强提示文案 |
|------|------------------------|----------------------|
| 核心思路 | `McpAuth` 调用 `connectMcpPluginOAuth` | 继续返回「去 Settings 授权」说明 |
| 改动范围 | agent-mcp-auth + executor | 仅 prompt 文案 |
| 优点 | 与 Cursor 行为对齐；Agent 可自助授权 | 零风险、极小 diff |
| 缺点 | 需浏览器交互；仅覆盖内置插件 | 用户体验差、矩阵仍「部分」 |
| 工作量 | 小（约 0.5d） | 极小 |
| 适合场景 | 产品要对齐 Cursor McpAuth | 短期不打算做 OAuth |

## 关键差异

- 提案 1 能让 Agent 在对话中完成 context7 等插件 OAuth。
- 提案 2 不改变运行时行为，调研矩阵无法更新为「已实现」。
- 两者均不支持任意 mcp.json server 的无元数据 OAuth。
- 提案 1 复用现有 token 存储，无新持久化格式。
- Settings「连接」与 Agent `McpAuth` 共享同一 OAuth 会话。

## 推荐方案

**推荐：提案 1 – 复用 Settings OAuth 管线**

已有 `mcp-oauth-connect.ts` 完整实现，最小改动即可闭合 Agent 侧缺口。

## 用户选择

用户消息「直接实现吧」→ **选定提案 1**，**无额外调整**。
