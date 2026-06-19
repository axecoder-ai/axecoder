# 功能实现报告

## 功能说明

- 新增 **Draw.IO** 聊天模式（位于 Plan 与 Multi-Agent 之间）
- Workshop 嵌入：左侧对话 + 右侧 `DrawIoEmbed` iframe（embed.diagrams.net）
- 移植 next-ai-draw-io 核心能力为**内置 Agent 工具**（非 MCP）：
  - `DisplayDiagram` — 全量替换图表 XML
  - `EditDiagram` — search/replace 编辑
  - `GetDiagram` — 读取当前 XML
- `sendDrawIoWorkshopMessage` 走 Agent 循环，`workshop-ipc` 在 `orchestrationChatMode === 'draw-io'` 时分流
- Workshop 会话持久化 `diagramXml`；IPC `drawIo:diagramUpdated` 实时刷新画布

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/draw-io/*` | 图表默认值、XML 编辑、会话缓存、Agent 回合 |
| `electron/main/draw-io-ipc.ts` | 图表查询 IPC |
| `electron/main/agent/agent-types.ts` 等 | 新工具与 chat-mode |
| `electron/main/workshop-ipc.ts` | draw-io 发送分支 |
| `src/utils/chat-modes.ts` | 新模式 |
| `src/components/workbench/DrawIoEmbed.vue` | 画布组件 |
| `src/components/workbench/WorkshopChatSection.vue` | 分栏 UI |
| `src/components/workbench/ChatPane.vue` | 嵌入同步 |
| `tests/unittest/UT-draw-io-mode/` | 单测 |

## 注意事项

- 依赖在线 `embed.diagrams.net`（与 next-ai-draw-io 默认一致）
- 首版未包含 shape library 文档工具与 VLM 校验
- 未使用 MCP / 外部 HTTP 服务
