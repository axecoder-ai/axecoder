## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** Agent/Workshop 回答时 Thinking 阶段应实时输出 reasoning 与工具步骤摘要，避免长时间无反馈。
- **调研来源：** `docs/deliverables/thinking-output/01-proposals.md`、`electron/main/agent/agent-loop.ts`、`src/stores/agentStore.ts`
- **上游提案：** `docs/proposals/proposal-thinking-live-progress.md`（双方案草稿）
- **选定基础：** 提案 1 – 最小闭环
- **用户调整摘要：** 同时覆盖 Workshop 模式的 reasoning 流式输出

### 现状总结

- 后端 Agent 模式已 emit `thinking_delta` / `content_delta`（OpenAI provider）。
- Workshop 模式仅 emit 合并 `delta`（content），**丢弃 reasoning**。
- `ChatPane` 调用 `agentStore.appendThinking`，但 store 仅有 `addThinkingDelta`，导致 thinking 不显示。
- `AgentProgressStream` 已有 `thinking-text` 展示槽位；`ThinkingPanel` 大组件本轮不集成。

---

### 最终方案 – 修通 thinking 流 + Workshop reasoning + 工具摘要

- **概述：** 统一 agentStore API，ChatPane/WorkshopPane 正确消费 `thinking_delta`；agent-loop Workshop 分支同样发送 reasoning；工具 start/done 时推送截断摘要到 progress，填充 Thinking 空窗。
- **相对选定提案的变更：** 增加 Workshop reasoning 流式；UI 仅用 AgentProgressStream，不引入 ThinkingPanel。
- **关键变更：**
  - `src/stores/agentStore.ts` — `appendThinking`、`currentThinking`、`thinkingType`、`setThinkingType`
  - `src/components/workbench/ChatPane.vue` — 对接 store API；`content_delta` 走 streamText
  - `src/components/workbench/WorkshopPane.vue` — 同步 reasoning 处理
  - `electron/main/agent/agent-loop.ts` — Workshop 也 emit `thinking_delta`/`content_delta`
  - `electron/main/agent/agent-loop.ts` + `src/utils/agent-progress.ts` — 可选 `tool_detail` 摘要
  - `src/components/workbench/AgentProgressStream.vue` — 展示 tool 摘要行
- **权衡：**
  - ✅ 小改动、立刻可见
  - ⚠️ 仅 OpenAI 兼容 reasoning 流；其他 provider 仍靠工具步骤
- **验证：** UT-thinking-output 全绿；手工 Agent + Workshop 各跑一轮
- **待解决问题：** Anthropic 等 provider 补 onDelta

### 未采纳方案说明

- **未选：** 提案 2 Trace 桥接
- **原因：** 改动大且不能单独解决推理中流式空窗；后续若有调试需求可叠加
