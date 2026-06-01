# 代码审查 — agent-mcp-runtime

## 结论

**通过**（无阻塞项）

## 功能

- 已消除 CallMcpTool / ReadMcpResource / ListMcpResources 的 Cursor IDE stub。
- 与已确认方案一致：SDK 连接池 + mcp.json 动态段。

## 质量

- 连接失败会从 pool 剔除，避免脏连接。
- 超时包装避免挂死 Agent 循环。
- `parseMcpServersFromJson` 可单测，不依赖用户主目录文件。

## 安全

- stdio 使用 SDK 默认安全 env 继承 + 用户 env 覆盖。
- headers 来自本地 mcp.json，不写入日志。

## 非阻塞待办

1. 可增加 `disconnectAllMcpServers` 在 Agent 会话结束时的钩子调用。
2. 集成测试：对本机 filesystem MCP server 冒烟（CI 可选）。
3. Streamable HTTP 与 SSE 自动回退（当前仅按 URL path 含 `sse` 分流）。
