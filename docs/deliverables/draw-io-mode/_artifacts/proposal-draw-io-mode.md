**状态：** 已确认（由 `/create-proposals` 生成）

## 已确认解决方案提案

**上下文：**
- **请求：** 将 next-ai-draw-io 的 AI 画图能力接入 AxeCoder；新增 **Draw.IO** 聊天模式（位于 Plan 与 Multi-Agent 之间）。
- **调研来源：** `docs/deliverables/draw-io-mode/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-draw-io-mode.md`（双方案草稿）
- **选定基础：** 提案 2 – Workshop 嵌入编排 + 专用 Draw.IO 工作区
- **用户调整摘要：**
  1. 将 next-ai-draw-io 核心逻辑**拷贝进本仓库**实现，不依赖 npx 远程包
  2. **不使用 MCP**（不走 CallMcpTool / mcp.json）
  3. **不启动外部 HTTP/MCP 服务**，画布在应用内 iframe 嵌入 embed.diagrams.net

### 最终方案 – Workshop 嵌入 + 内置图表工具（去 MCP 原生移植）

- **概述：** 新增 `draw-io` 聊天模式，作为第三种 Workshop 嵌入模式。将 MCP Server 中的 diagram 操作与 draw.io embed 协议移植到 `electron/main/draw-io/`；Agent 通过内置工具 `DisplayDiagram` / `EditDiagram` / `GetDiagram` 读写图表 XML；渲染进程 `DrawIoEmbed.vue` 用 iframe + postMessage 在应用内预览；Workshop 会话持久化 `diagramXml`。
- **相对选定提案的变更：**
  - 弃用 `@next-ai-drawio/mcp-server` 与 MCP 插件路径
  - 不运行 localhost HTTP 预览服务；状态经 IPC 在 Main ↔ Renderer 同步
  - 拷贝并精简 `diagram-operations`、`pages`、`xml-validation` 至 Main 进程
- **关键变更：**
  - `electron/main/draw-io/*`（新建）
  - `electron/main/agent/agent-types.ts`、`agent-ext-executor.ts`、`agent-tool-prompts-ext.ts`、`chat-mode.ts`
  - `electron/main/workshop/workshop-types.ts`、`workshop-ipc.ts`
  - `electron/main/draw-io-ipc.ts`（新建）
  - `src/utils/chat-modes.ts`、`src/types/axecoder.d.ts`
  - `src/components/workbench/DrawIoEmbed.vue`、`DrawIoWorkshopSection.vue`
  - `src/components/workbench/ChatPane.vue`、`WorkshopChatSection.vue`（orchestration 分支）
  - `tests/unittest/UT-draw-io-mode/`
- **权衡：** 需维护移植代码；依赖在线 embed.diagrams.net（与 next-ai-draw-io 默认一致）；首版不含 VLM 校验与模板库全量能力。
- **验证：** UT 覆盖模式顺序、图表工具、XML 操作；手工：选 Draw.IO → 描述流程图 → 右侧画布更新。
- **待解决问题：** 离线自建 draw.io 可后续通过 `DRAWIO_BASE_URL` 环境变量支持。

### 未采纳方案说明

- **未选：** 提案 1 – MCP 内置插件路径
- **原因：** 用户明确要求不要 MCP、不要外部服务。
