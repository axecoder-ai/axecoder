# agent-mcp-runtime 实施计划

## 需求

- 读 `~/.cursor/mcp.json` 与 `~/.config/axecoder/mcp.json`（含 env、headers）。
- `CallMcpTool` / `ListMcpResources` / `ReadMcpResource` 经 SDK 连接真实 MCP 进程或 URL。
- `getMcpInstructionsSection` 写入 system prompt，成功连接时列出 tools。
- `/mcp` 斜杠命令与 IPC `agent:listMcp` 使用真实列表。

## 阶段

1. `npm install @modelcontextprotocol/sdk`
2. `agent-mcp-runtime.ts` — 连接池、stdio/SSE/StreamableHTTP
3. `agent-mcp.ts` — 配置解析增强，导出运行时 API
4. `agent-ext-executor.ts` / `agent-ipc.ts` / `agent-mcp-instructions.ts` 接线
5. `tests/unittest/UT-agent-mcp-runtime/`

## 文件

| 路径 | 操作 |
|------|------|
| `electron/main/agent/agent-mcp-runtime.ts` | 新增 |
| `electron/main/agent/agent-mcp.ts` | 修改 |
| `electron/main/agent/agent-mcp-instructions.ts` | 修改 |
| `electron/main/agent/agent-ext-executor.ts` | 修改 |
| `electron/main/agent-ipc.ts` | 修改 |
| `package.json` | 依赖 |
