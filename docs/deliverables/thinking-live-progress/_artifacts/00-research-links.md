# 调研材料索引

- `docs/deliverables/thinking-output/01-proposals.md` — 现有 Thinking 输出候选方案与数据流分析
- `docs/proposals/proposal-thinking-output.md` — 历史完整重构方案（方案 C，范围过大）
- `electron/main/agent/agent-loop.ts` — `thinking_delta` / `content_delta` 已分离发送
- `electron/main/ai-trace-store.ts` — Trace 多轮 model/tool 事件模型
- `src/components/workbench/ChatPane.vue` — 前端进度绑定（存在 agentStore API 不匹配）
- `src/stores/agentStore.ts` — thinking chunks 状态（缺 `appendThinking` 等 ChatPane 调用）
- `src/components/workbench/AgentProgressStream.vue` — 进度 UI（已有 thinking 展示槽位）
- `src/components/workbench/AiTracePanel.vue` — Trace 多轮会话展示参考
