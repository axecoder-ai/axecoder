# 调研来源

| 路径 | 说明 |
|------|------|
| `next-ai-draw-io/README.md` | 项目定位：AI + draw.io；MCP Server 快速配置 |
| `next-ai-draw-io/packages/mcp-server/README.md` | `@next-ai-drawio/mcp-server`：stdio MCP + 内嵌 HTTP 预览 |
| `next-ai-draw-io/packages/mcp-server/src/http-server.ts` | 内嵌 HTTP 服务、draw.io embed、session 同步 |
| `src/utils/chat-modes.ts` | 现有模式列表与 Workshop 嵌入判定 |
| `electron/main/agent/chat-mode.ts` | 主进程 ChatMode 与 system addon |
| `src/components/workbench/ChatPane.vue` | multi-agent / software-company 嵌入 Workshop 模式 |
| `electron/main/agent/agent-mcp.ts` | MCP 配置加载与 CallMcpTool 运行时 |
| `electron/main/mcp-plugins-registry.ts` | 内置 MCP 插件（当前仅 Context7） |
| `docs/deliverables/workshop-multi-agent/` | Multi-Agent 模式接入先例 |

**调研缺口：** AxeCoder 内嵌 WebView 加载 MCP HTTP 预览尚无现成组件；需新建 `DrawIoPanel` 或复用 Electron `webview`/`BrowserView`。
