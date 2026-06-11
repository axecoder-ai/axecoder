# create_plan + Plan Build UI — 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | create-plan-build-ui |
| 完成日期 | 2026-06-11 |
| 选定方案 | 提案 1 — CreatePlan 阻塞审批 + 聊天/编辑器 Build |
| 审查结论 | 通过 |
| 单测 | 全绿（9/9） |

---

## 1. 概述

实现内置 Agent 工具 **CreatePlan**（对齐 Cursor `create_plan`）：在 planMode 下生成 `docs/plans/plan-*.md`，聊天内展示可 Build 的计划卡片；打开计划文件时编辑器 Tab 栏亦有 **Build**，执行等价 `/implement` 的实现流程。

**选型：** 推荐并采用提案 1；用户要求保留编辑器 Build 按钮。

**交付物目录：** `docs/deliverables/create-plan-build-ui/_artifacts/`

---

## 2. 方案

- `CreatePlan` 写计划 Markdown + `plan_pending` 阻塞。
- Build：退出 planMode、切 agent、注入 implement playbook + 计划全文。
- Dismiss：清除 pending，可选继续对话。
- 编辑器 Build：无 pending 时经 `agentComposePlanBuild` 合成用户消息后发 Agent。

详见 `_artifacts/proposal-create-plan-build-ui.md`。

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 核心 | plan_pending + 聊天 Build | 非阻塞写文件 + 编辑器 Build |
| 对齐 Cursor | 高 | 中 |
| 工作量 | 中 | 小 |

**用户选择：** 提案 1；**调整：** 必须保留编辑器 Build。

详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

阶段：后端 pending/IPC → 前端 ChatPlanCard + EditorPane → 单测与交付。

详见 `_artifacts/plan-create-plan-build-ui.md`。

---

## 5. 实现说明

- 新增 `agent-create-plan.ts`、`ChatPlanCard.vue`。
- `tool-executor` / `agent-loop` 扩展 `plan_pending`。
- IPC：`agent:buildPlan`、`agent:dismissPlan`、`agent:composePlanBuild`。

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

```bash
npx vitest run tests/unittest/UT-create-plan-build-ui/create-plan-build-ui.test.ts
```

**9/9 通过，全绿。** 见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 单测：写盘、别名、planMode 门控、plan_pending、compose implement 消息、dismiss 多 pending。
- 回归：`UT-switch-mode-tool`、`UT-agent-tool-level-prompts`、`UT-agent-tool-layer-parity` 通过。
- 手工：Plan 模式 → CreatePlan → 聊天 Build；打开 plan 文件 → 编辑器 Build（待用户验收）。

---

## 8. 代码审查

**结论：通过。** 无阻塞项；非阻塞：system prompt 热更新、TodoWrite 同步、矩阵文档更新。

详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-create-plan.ts` | 新增 | 计划核心逻辑 |
| `electron/main/agent/agent-loop.ts` | 修改 | plan_pending / Build |
| `electron/main/agent/tool-executor.ts` | 修改 | CreatePlan 执行 |
| `src/components/workbench/ChatPlanCard.vue` | 新增 | 计划卡片 |
| `src/components/workbench/EditorPane.vue` | 修改 | Build 按钮 |
| `src/components/workbench/ChatPane.vue` | 修改 | Build/Dismiss/桥接 |
| `tests/unittest/UT-create-plan-build-ui/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

1. CreatePlan todos 与 TodoWrite 双向同步。
2. 更新 `research-agent-tools-matrix.md` §3 create_plan 为「已实现」。
3. 聊天 Build 全链路 E2E（需有效 model）手工验收。

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型 | `_artifacts/02-selection.md` |
| 双方案/已确认方案 | `_artifacts/proposal-create-plan-build-ui.md` |
| 实施计划 | `_artifacts/plan-create-plan-build-ui.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 审查 | `_artifacts/06-code-review.md` |
