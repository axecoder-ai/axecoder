# Workshop 群聊重做 — 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | workshop-redesign |
| 完成日期 | 2026-06-03 |
| 选定方案 | 提案 2 – 统一消息 Facade + Turn 路由编排 |
| 审查结论 | 通过 |
| 单测 | 全绿（37/37） |

---

## 1. 概述

**需求：** 完全重做 Workshop 群聊——AI 路由接话人与话语权，技术经理代 BOSS 派活，BOSS 仅在澄清时介入；与 Agent 共用 ChatPane。

**目标：** 用更简单的 turn 循环取代失败的拆步/验收编排，并通过 Facade 统一前端会话入口。

**选型：** 推荐提案 1（快落地），用户选定 **提案 2**（Facade 长期结构）+ **no_legacy**（清除旧 stepPlan）。

**交付目录：** `docs/deliverables/workshop-redesign/_artifacts/`

---

## 2. 方案

见 `_artifacts/proposal-workshop-redesign.md`。

核心：新 `workshop-turn-orchestrator` + `workshop-router`；`useWorkbenchSession` + `WorkshopChatSection` 嵌入 ChatPane；Workshop 按钮 / Agents 侧栏进入。

---

## 3. 方案选型过程

见 `_artifacts/02-selection.md`。

- **用户选定：** 提案 2
- **调整：** 不兼容旧 Workshop stepPlan

---

## 4. 实施计划

见 `_artifacts/plan-workshop-redesign.md`（三阶段：后端 TDD → 前端 Facade → 清理）。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。

要点：turn 循环、workshop:sendMessage、profile BOSS、App 移除中央 WorkshopPane。

---

## 6. 单元测试执行情况

见 `_artifacts/05-unittest.md`。

- 命令：`npm test -- tests/unittest/UT-collab-workshop/ tests/unittest/UT-unified-session-list/`
- **37 passed，0 failed** ✅

---

## 7. 测试报告

| 场景 | 状态 |
|------|------|
| scripted 多轮 turn → done | 单测 ✅ |
| boss_clarify 挂起与恢复 | 单测 ✅ |
| router JSON 解析 | 单测 ✅ |
| message adapter | 单测 ✅ |
| 手工 E2E | 待用户本地验证 |

---

## 8. 代码审查

见 `_artifacts/06-code-review.md`。

**结论：通过。** 非阻塞：可删 WorkshopPane.vue、路由 LLM 重试。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/workshop/workshop-turn-orchestrator.ts` | 新增 | Turn 编排 |
| `electron/main/workshop/workshop-router.ts` | 新增 | AI 路由 JSON |
| `electron/main/workshop/workshop-api-messages.ts` | 新增 | API role + legacy strip |
| `src/composables/useWorkbenchSession.ts` | 新增 | Facade |
| `src/components/workbench/WorkshopChatSection.vue` | 新增 | 群聊 UI |
| `src/components/workbench/ChatPane.vue` | 修改 | sessionKind |
| `src/App.vue` | 修改 | 共用 Chat 列 |
| `electron/main/workshop/workshop-orchestrator.ts` | 修改 | re-export |

---

## 10. 遗留项与后续建议

1. 删除未挂载的 `WorkshopPane.vue`。
2. 废弃 `workshop-plan-parse.ts`（旧拆步专用）。
3. 路由 LLM 失败重试 / 降级策略。
4. 手工验证：Workshop 按钮 → 多轮群聊 → 澄清 → 结束。

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-workshop-redesign.md` |
| 计划 | `_artifacts/plan-workshop-redesign.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 审查 | `_artifacts/06-code-review.md` |
