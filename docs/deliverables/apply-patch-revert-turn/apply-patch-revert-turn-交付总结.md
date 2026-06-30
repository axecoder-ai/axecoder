---
任务名: apply-patch-revert-turn
完成日期: 2026-06-30
选定方案: 提案 1 – ApplyPatch + per-pending 逆 patch（与 Edit/Write 并存）
审查结论: 通过
单测全绿: 是
---

# apply-patch-revert-turn 交付总结

## 1. 概述

**需求：** Agent 文件编辑与回滚粒度过粗——缺 `apply_patch`、只能整轮 Undo。

**本轮目标：** 新增 `ApplyPatch` / `RevertTurn` 工具，细化 `turnFileChanges` 与 UI 单文件回滚。

**选型：** 推荐并选定提案 1；用户要求 ApplyPatch 与 Edit/Write **并存**。

**交付物目录：** `docs/deliverables/apply-patch-revert-turn/_artifacts/`

---

## 2. 方案

见 `_artifacts/proposal-apply-patch-revert-turn.md`（状态：已确认）。

要点：
- unified diff 格式 `ApplyPatch`
- `RevertTurn` scope=file|turn
- 不废弃 Edit/Write

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 核心 | ApplyPatch + 逆 patch | MultiEdit + per-pending |
| 工作量 | 中 | 小 |

**用户选择：** 提案 1；调整：Edit/Write 并存。

全文：`_artifacts/02-selection.md`

---

## 4. 实施计划

阶段：核心模块 → Agent 工具 → IPC/UI → 单测。

全文：`_artifacts/plan-apply-patch-revert-turn.md`

---

## 5. 实现说明

- `apply-patch.ts` / `agent-revert.ts` 核心逻辑
- `tool-executor` 注册 ApplyPatch、RevertTurn
- `ChatTurnChangesBar` 单文件 Undo

全文：`_artifacts/05-implement-report.md`

---

## 6. 单元测试执行情况

- 命令：`npm test -- tests/unittest/UT-apply-patch-revert-turn/apply-patch-revert.test.ts`
- **5/5 通过，全绿**

全文：`_artifacts/05-unittest.md`

---

## 7. 测试报告

- 自动化：见第 6 节
- 手工：待补充（建议：多文件 patch 审批、单文件 Undo、RevertTurn turn scope）

---

## 8. 代码审查

**结论：通过**；无阻塞项。

全文：`_artifacts/06-code-review.md`

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/apply-patch.ts` | 新增 | unified diff 规划 |
| `electron/main/agent/agent-revert.ts` | 新增 | 单文件逆 patch |
| `electron/main/agent/agent-types.ts` | 修改 | 工具名与类型 |
| `electron/main/agent/tool-executor.ts` | 修改 | 工具执行 |
| `electron/main/agent/agent-tool-prompts.ts` | 修改 | 工具定义 |
| `electron/main/agent/agent-loop.ts` | 修改 | turnFileChanges 条目化 |
| `electron/main/agent-ipc.ts` | 修改 | revertFilePatch IPC |
| `electron/preload/index.ts` | 修改 | preload API |
| `src/types/axecoder.d.ts` | 修改 | 前端类型 |
| `src/components/workbench/ChatTurnChangesBar.vue` | 修改 | 单文件 Undo |
| `src/components/workbench/ChatPane.vue` | 修改 | undo 处理 |
| `tests/unittest/UT-apply-patch-revert-turn/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

1. OpenCode `*** Begin Patch` 方言支持
2. ApplyPatch 多文件 pending 的 per-file diff UI
3. 更新 `research-agent-tools-matrix.md` AxeCoder 列

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型记录 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-apply-patch-revert-turn.md` |
| 实施计划 | `_artifacts/plan-apply-patch-revert-turn.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测记录 | `_artifacts/05-unittest.md` |
| 代码审查 | `_artifacts/06-code-review.md` |
