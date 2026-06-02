# 调研链接

- `docs/plans/plan-collab-workshop.md` — Collab Workshop V1 编排与 UI
- `docs/deliverables/collab-llm-role-pad/collab-llm-role-pad-交付总结.md` — 连续同 API 角色 hidden pad
- `docs/deliverables/unified-session-list/unified-session-list-交付总结.md` — Chat/协作统一会话列表（进行中）
- `electron/main/workshop/workshop-orchestrator.ts` — 编排、pushMessage、API 角色 pad
- `electron/main/workshop/workshop-llm.ts` — LLM 发言（reasoning/content 混流）
- `src/components/workbench/WorkshopPane.vue` — 思考动画 + AgentProgressStream
- `src/components/workbench/WorkshopMessageItem.vue` — 气泡与 thinking 三点动画
- `src/components/workbench/AgentProgressStream.vue` — Agent 流式推理块（参考 UI）
- `electron/main/ai/openai-messages.ts` — Chat 侧 reasoningContent 出线
