# draw-io-mode 实施计划

**状态：** 已确认方案 `docs/proposals/proposal-draw-io-mode.md`

## 阶段 1 – 模式与类型

1. `ChatModeId` 增加 `draw-io`；`CHAT_MODE_OPTIONS` 插入 Plan 与 Multi-Agent 之间
2. `isWorkshopEmbeddedChatMode` 包含 `draw-io`
3. `WorkshopSession` 增加 `diagramXml?: string`

## 阶段 2 – Main 图表引擎（移植精简）

1. `electron/main/draw-io/draw-io-defaults.ts` — 空白 mxfile
2. `electron/main/draw-io/draw-io-xml.ts` — search/replace 编辑
3. 内置工具 `DisplayDiagram` / `EditDiagram` / `GetDiagram`
4. `draw-io-turn.ts` — Workshop 发送走 Agent 单轮

## 阶段 3 – IPC 与 UI

1. `draw-io-ipc.ts` — 图表状态订阅
2. `DrawIoEmbed.vue` — iframe + postMessage
3. `WorkshopChatSection.vue` — draw-io 分栏
4. `ChatPane.vue` — 嵌入同步

## 阶段 4 – 测试

1. `UT-draw-io-mode` — XML 编辑、模式顺序
2. `UT-chat-mode-lock` — draw-io 锁定规则
