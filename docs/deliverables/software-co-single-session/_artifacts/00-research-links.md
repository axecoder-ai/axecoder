# 调研链接

| 路径 | 说明 |
|------|------|
| `electron/main/sop/sop-pipeline-engine.ts` | 硬编排状态机：多阶段串行、按 task 实现、QA 环 |
| `electron/main/agent/agent-loop.ts` | `runWorkshopRoleAgentTurn` / `runAgentLoopUntilDoneOrPending` 同源 Agent 循环 |
| `electron/main/workshop/workshop-agent-speaker.ts` | 每角色独立 session，回合结束删 session |
| `electron/main/sop/sop-role-tools.ts` | 角色工具阉割 |
| `electron/main/sop/sop-task-runner.ts` | 逐 task + 每 task 跑测 |
| `electron/main/sop/sop-intent.ts` | 增量意图仅跳过 PRD/Design 起点 |
| `docs/deliverables/software-co-metagpt-parity/` | 上一轮 MetaGPT 对齐交付 |
| 对话上下文 | 第一性原理：Software Co. 应与 Agent 同效率，差在编排层 |
