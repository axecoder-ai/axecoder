# 调研链接

| 来源 | 路径 / 说明 |
|------|-------------|
| 既有 MetaGPT 对齐交付 | `docs/deliverables/metagpt-alignment/metagpt-alignment-交付总结.md` |
| SOP 流水线引擎 | `electron/main/sop/sop-pipeline-engine.ts` |
| Message Pool | `electron/main/sop/message-pool.ts`（6k/20k 截断） |
| QA 闭环 | `electron/main/sop/qa-loop.ts` |
| 阶段闸门 | `electron/main/sop/sop-gates.ts` |
| SOP 类型与阶段链 | `electron/main/sop/sop-types.ts` |
| 角色 prompt | `electron/main/sop/sop-prompts.ts` |
| Workshop speaker | `electron/main/workshop/workshop-agent-speaker.ts`、`workshop-subagent-speaker.ts` |
| 内置角色 | `electron/main/builtin-workflow-roles.ts` |
| ChatMode | `electron/main/agent/chat-mode.ts`、`src/utils/chat-modes.ts` |
| 单测 | `tests/unittest/UT-sop-pipeline/`、`UT-sop-message-pool/`、`UT-sop-qa-loop/` |
| MetaGPT 论文（外部） | https://arxiv.org/pdf/2308.00352 §3.1–3.3 |

## 调研缺口

- 无 MetaGPT Python 源码逐行对照；本轮基于论文机制 + 既有 `metagpt-alignment` 交付与代码审计。
- 关键差距：`implement` 未按 `sop-tasks.json` 逐 task 循环；QA 缺自动 shell 跑测；Pool 截断丢上下文；无角色工具剖面；无意图分流。
