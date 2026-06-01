# 选型记录

## 2a 选型摘要

### 一句话需求回顾

将 AxeCoder Agent 的 MCP 从 stub（提示去 Cursor IDE）升级为 Main 进程内真实 MCP 客户端：读取 `mcp.json`、写入 system prompt，并通过 `CallMcpTool` / `ListMcpResources` / `ReadMcpResource` 连接已配置服务器。

### 方案对比表

| 维度 | 提案 1 SDK 连接池 | 提案 2 CLI 桥接 |
|------|-------------------|-----------------|
| 核心思路 | `@modelcontextprotocol/sdk` 长连接 | 每调用 spawn CLI |
| 主要改动范围 | agent-mcp*、executor、package.json | agent-mcp-bridge、executor |
| 优点 | 延迟低、可复用、与 Claude Code 一致 | 改动文件少 |
| 缺点 / 风险 | 子进程生命周期、打包 PATH | 冷启动慢、难测 |
| 工作量 | 中 | 小 |
| 适合场景 | 产品级 Agent MCP | 临时验证 |

### 关键差异

- 提案 1 可在同一会话内复用 MCP 连接；提案 2 每次工具调用重启。
- 提案 1 可在 `getMcpInstructionsSection` 附带 live tools/resources 摘要。
- 提案 2 强依赖本机 `npx` CLI 稳定性。

### 推荐方案

**推荐：提案 1 – Main 进程 MCP SDK 连接池**

与 `agent-tool-layer-parity` 审查待办一致，满足用户「直接实现」真实运行时。

### 选型提示

下一步已通过选择题确认。

## 2b 用户最终选择

- **选定提案：** 提案 1 – Main 进程 MCP SDK 连接池
- **调整说明：** 无额外调整
