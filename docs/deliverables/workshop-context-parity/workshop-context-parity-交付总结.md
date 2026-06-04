# workshop-context-parity 交付总结

| 字段 | 值 |
|------|-----|
| 任务 | workshop-context-parity |
| 完成日期 | 2026-06-04 |
| 选定方案 | 提案 1 + Tech Lead 读码 |
| 审查 | 通过 |
| 本轮相关单测 | 12/12 绿 |

## 1. 概述

Multi-Agent（Workshop）此前弱于 Chat Agent，主因是跨角色**摘要丢信息**与 Tech Lead **无读码能力**。本轮在保留 Workshop 编排的前提下加厚 `priorSummary`、成员实质结论落盘、派活前 Tech Lead 只读 Agent 扫仓，并与 Agent 共用 `activeModelId`；图片仍走既有 `pendingUserImages` 链。

交付目录：`docs/deliverables/workshop-context-parity/`。

## 2. 方案

见 `_artifacts/proposal-workshop-context-parity.md`（**状态：已确认**）。

## 3. 方案选型

推荐提案 1；用户选定提案 1 并要求 Tech Lead 可读代码。见 `_artifacts/02-selection.md`。

## 4. 实施计划

四阶段：上下文管道 → prompt/路由 → Tech Lead 读码 → 模型与多模态。见 `_artifacts/plan-workshop-context-parity.md`。

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。

## 6. 单元测试

```bash
npm test -- tests/unittest/UT-workshop-context-parity tests/unittest/UT-collab-workshop/workshop-turn-orchestrator.test.ts tests/unittest/UT-workshop-agent-parity
```

**本轮相关：全绿。** 全量 `UT-collab-workshop` 含 2 个历史失败项，见 `_artifacts/05-unittest.md`。

## 7. 测试报告

- 手工建议：Multi-Agent 连续两轮不同角色改同一模块，第二轮应能引用第一轮结论；带图消息各角色 turn 应收到 images。
- 集成/E2E：待补充。

## 8. 代码审查

通过。见 `_artifacts/06-code-review.md`。

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/workshop/workshop-display.ts` | 修改 | 成员/Tech Lead 摘要 |
| `electron/main/workshop/workshop-api-messages.ts` | 修改 | priorSummary、lastMemberContext |
| `electron/main/workshop/workshop-turn-orchestrator.ts` | 修改 | 读码、reasoning 落盘 |
| `electron/main/workshop/workshop-router.ts` | 修改 | 路由上下文 |
| `electron/main/workshop/workshop-subagent-speaker.ts` | 修改 | prompt |
| `electron/main/workshop/workshop-agent-speaker.ts` | 修改 | 读码展示 |
| `electron/main/agent/agent-loop.ts` | 修改 | manager_chat 只读工具 |
| `electron/main/workshop-ipc.ts` | 修改 | 清空 pending 图片 |
| `src/components/workbench/WorkshopChatSection.vue` | 修改 | preferredModelId |
| `src/components/workbench/ChatPane.vue` | 修改 | 同步 activeModelId |
| `tests/unittest/UT-workshop-context-parity/*` | 新增 | 单测 |

## 10. 遗留项

- 提案 2：统一 Workshop 持久 Agent session。
- priorSummary 12k 上限下的超长协作 compaction。

## 11. 附录：过程文档索引

- `_artifacts/00-research-links.md`
- `_artifacts/02-selection.md`
- `_artifacts/proposal-workshop-context-parity.md`
- `_artifacts/plan-workshop-context-parity.md`
- `_artifacts/05-implement-report.md`
- `_artifacts/05-unittest.md`
- `_artifacts/06-code-review.md`
