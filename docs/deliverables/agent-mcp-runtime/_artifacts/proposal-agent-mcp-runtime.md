**状态：** 已确认

## 已确认解决方案提案

**上下文：**
- **请求：** Main 进程内真实 MCP 客户端，替代 CallMcpTool/ReadMcpResource 的 Cursor IDE stub。
- **调研来源：** `docs/research/research-axecoder-vs-claude-code.md`、`agent-mcp.ts`、`agent-tool-layer-parity` 审查待办。
- **选定：** 提案 1 – Main 进程 MCP SDK 连接池；无额外调整。

### 最终方案

- **概述：** 使用 `@modelcontextprotocol/sdk` 按 `mcp.json` 懒连接 stdio / URL 服务器；`CallMcpTool`、`ListMcpResources`、`ReadMcpResource` 走真实协议；`getMcpInstructionsSection` 附带各服务器 tools 摘要（连接成功时）。
- **关键变更：** `agent-mcp.ts`、`agent-mcp-runtime.ts`（新建）、`agent-mcp-instructions.ts`、`agent-ext-executor.ts`、`agent-ipc.ts`、`package.json`、`UT-agent-mcp-runtime/`。
- **权衡：** 首次连接有延迟；OAuth 服务器仍可能需用户在外部完成授权。
- **验证：** Vitest 覆盖配置解析与错误路径；可选本机 MCP server 冒烟。

### 未采纳

- 提案 2 CLI 桥接：冷启动与可测性差。
