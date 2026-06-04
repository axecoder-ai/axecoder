# 调研链接

| 文档/模块 | 路径 | 要点 |
|-----------|------|------|
| 上轮 Multi-Agent 弱于 Chat 分析 | 会话上下文 | 摘要丢信息、Tech Lead 无工具、成员回合销毁 session |
| Workshop 需求 | `docs/proposals/requirements-workshop-redesign.md` | 轮流发言 + Agent 工具、仅澄清时暂停 |
| Agent 工具对齐 | `docs/deliverables/workshop-agent-parity/` | `runWorkshopRoleAgentTurn` 已有完整工具 |
| 信息压扁 | `electron/main/workshop/workshop-display.ts` | `formatMemberChatSummary` 仅保留 Done+路径 |
| 上下文传递 | `electron/main/workshop/workshop-api-messages.ts` | `priorSummaryFromMessages` 只用 `m.text` |
| 编排 | `electron/main/workshop/workshop-turn-orchestrator.ts` | manager 纯 JSON LLM，成员 `runMemberSpeak` |
| 路由 | `electron/main/workshop/workshop-router-llm.ts` | 无工具 |
| Chat 集成 | `docs/deliverables/workshop-multi-agent/` | `multi-agent` ↔ workshop IPC |
| 前端 | `src/components/workbench/WorkshopChatSection.vue` | 图片附件已有 `imageRefs` |
