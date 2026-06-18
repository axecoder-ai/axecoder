# 调研链接

| 来源 | 路径 / 说明 |
|------|-------------|
| 内置工作流角色 | `electron/main/builtin-workflow-roles.ts` |
| Workshop 类型与 phase | `electron/main/workshop/workshop-types.ts` |
| Multi-Agent turn 编排 | `electron/main/coordinator/coordinator-turn-engine.ts` |
| Workshop 路由（AI 派活） | `electron/main/workshop/workshop-router.ts` |
| rppit 全流程 playbook | `resources/builtin-commands/rppit.md` |
| ChatMode 定义 | `src/utils/chat-modes.ts`、`electron/main/agent/chat-mode.ts` |
| Coordinator 多 Agent 交付 | `docs/deliverables/coordinator-multi-agent/coordinator-multi-agent-交付总结.md` |
| Workshop 重做需求 | `docs/proposals/requirements-workshop-redesign.md` |
| Agent 工具矩阵 | `docs/research/research-agent-tools-matrix.md` |
| MetaGPT 论文（外部） | https://arxiv.org/pdf/2308.00352 |

## 调研缺口

- 无项目内 MetaGPT 对标专项文档；本轮基于对话差距分析与代码审计。
- Message Pool / Role-Action-Watch 在 AxeCoder 中均未实现，需新建模块。
