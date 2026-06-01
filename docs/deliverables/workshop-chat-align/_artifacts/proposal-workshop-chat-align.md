## 已确认解决方案提案

**状态：** 已确认

**上下文：**
- **请求：** Workshop 停用子代理；每角色使用与 Session Chat **非 Agent 模式** 相同的 `aiChat` + SSE 流式。
- **选定基础：** 提案 2 – 每角色纯 aiChat
- **用户调整摘要：** 无

### 最终方案 – 每角色 `chatWithProvider` + `ai:stream`

- **概述：** 默认 `buildLlmRoleSpeaker`（`workshop-llm.ts`），OpenAI 模型经 `emitAiStream` 推送 `workshop-{id}-{roleId}`；`WorkshopPane` 继续 `onAiStream` 流式气泡。`workshop-ipc` 不再默认 `buildSubagentRoleSpeaker`。保留 scripted 单测路径；subagent 模块仅作遗留/单测。
- **关键变更：** `workshop-llm.ts`、`workshop-ipc.ts`、`WorkshopPane.vue`（文案）、单测。
- **权衡：** 实现小；**无代码库工具**。与 Chat **Agent 模式** 不等价，与 Chat **纯对话模式** 对齐。
- **验证：** 单测 LLM speaker + streamId；手工无 max turns 弹窗。
- **待解决问题：** 需读代码时请用户切主 Chat Agent 或后续改选提案 1。

### 未采纳

- 提案 1：用户未选。
