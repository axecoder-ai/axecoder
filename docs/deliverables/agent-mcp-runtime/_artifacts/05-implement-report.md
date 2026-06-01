# 功能实现报告 — agent-mcp-runtime

## 功能说明

- 使用 `@modelcontextprotocol/sdk@1.29.0` 在 Electron Main 内连接 `mcp.json` 配置的 MCP 服务器。
- **stdio**：`command` + `args` + `env` + `cwd`
- **URL**：路径含 `sse` 时用 `SSEClientTransport`，否则 `StreamableHTTPClientTransport`；支持 `headers`
- **CallMcpTool**：真实 `client.callTool`，返回文本化 content
- **ListMcpResources**：对各已配置 server 调用 `listResources`
- **ReadMcpResource**：`readResource` 按 URI 读取
- **getMcpInstructionsSection**：连接成功后列出各 server 的 tools 与 server instructions
- **/mcp** IPC：改用 `listMcpResources()` 真实列表
- 连接池按 server 名缓存；失败时断开并重试

## 修改文件

| 文件 | 说明 |
|------|------|
| `package.json` / `package-lock.json` | 新增 MCP SDK 依赖 |
| `electron/main/agent/agent-mcp-runtime.ts` | 新建：连接池与协议调用 |
| `electron/main/agent/agent-mcp.ts` | 配置解析增强；导出 live API |
| `electron/main/agent/agent-mcp-instructions.ts` | 动态段含 tools 摘要 |
| `electron/main/agent/agent-ext-executor.ts` | 四 MCP 工具接线 |
| `electron/main/agent-ipc.ts` | listMcp 接线 |
| `tests/unittest/UT-agent-mcp-runtime/` | 配置解析单测 |

## 注意事项

- 首次连接可能较慢（spawn + initialize）；超时 30s。
- OAuth MCP 仍需用户在配置/外部完成授权；`McpAuth` 返回说明性文案。
- 无 `mcp.json` 时行为与此前一致：提示添加配置。
