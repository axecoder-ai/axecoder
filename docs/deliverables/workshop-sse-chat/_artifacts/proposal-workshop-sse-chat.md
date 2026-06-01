## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** Collab Workshop 各角色发言需与主聊天一样 **SSE 流式显示**；UI 保持多角色群聊气泡。
- **调研来源：** `electron/main/ai-ipc.ts`、`ai-stream-emit.ts`、`agent-loop.ts`（delta）、`workshop-subagent-speaker.ts`、`ChatPane.vue`、`plan-collab-workshop.md`
- **上游提案：** `docs/proposals/proposal-workshop-sse-chat.md`（make-proposals 双方案）
- **选定基础：** **提案 2** — 复用 `ai:stream` + streamId 绑定角色
- **用户调整摘要：** 无额外调整

### 现状总结

- 普通聊天：`ai:chat` + `onAiStream`，`streamId` 由客户端生成（OpenAI provider）。
- Workshop：`workshop:progress` 仅 `thinking` / `speaking` / `done`；`runSubAgentTask` 未传 `onDelta`，长时间无文字反馈。

---

### 最终方案 – 复用 `ai:stream` + workshop streamId 约定

- **概述：** 每个角色发言使用固定 `streamId`：`workshop-{workshopId}-{roleId}`。`runSubAgentTask` 在 OpenAI 模型下将 `chatWithToolsForModel` 的 SSE delta 经 `emitAiStream` 推到渲染进程；`WorkshopPane` 订阅 `onAiStream` 并按前缀过滤，用 `streamText` 展示当前角色流式气泡；`workshop:progress` 仍负责 thinking/speaking/done。编排将 `speaking` 提前到 speaker 调用前，结束后写入消息并清空流缓冲。
- **相对选定提案的变更：** 无（按提案 2 实施）。
- **关键变更：**
  - `electron/main/workshop/workshop-stream.ts` — `buildWorkshopStreamId` / 前缀解析
  - `electron/main/agent/agent-subagent.ts` — `RunSubAgentOptions.onDelta`
  - `electron/main/workshop/workshop-subagent-speaker.ts`、`workshop-orchestrator.ts`、`workshop-ipc.ts`
  - `src/components/workbench/WorkshopPane.vue`、`WorkshopMessageItem.vue`
  - `src/utils/workshop-stream.ts`（渲染端前缀匹配）
  - 单测：`workshop-stream.test.ts`、更新 orchestrator/subagent 相关测试
- **权衡：**
  - ✅ 复用成熟 `ai:stream` 管道，与 ChatPane 行为一致。
  - ⚠️ Chat 与 Workshop 同时流式时依赖 streamId 前缀隔离；禁止非 workshop 使用 `workshop-` 前缀。
  - ⚠️ 非 OpenAI provider 无 token 流，结束后整段显示（与 Chat 一致）。
- **验证：**
  - 单测：streamId 构建/解析；mock onDelta 转发。
  - 手工：开始协作 → 经理角色可见逐字输出 → 落盘消息与流式一致。
- **待解决问题：** 子代理工具调用进度是否展示；Anthropic/Ollama 流式补全。

### 未采纳方案说明

- **未选：** 提案 1（扩展 workshop:progress delta）
- **原因：** 用户选定提案 2。
