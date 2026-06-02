# collab-workshop-display 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | collab-workshop-display |
| 完成日期 | 2026-06-02 |
| 选定方案 | 提案 1 – 单条 assistant 复合消息 + 严格 users.json 绑定 |
| 审查结论 | 通过 |
| 单测全绿 | 是（27/27） |

---

## 1. 概述

**需求：** 协作 Workshop 中 (1) 思考过程显示在 AI 回复气泡**下方**；(2) AI 身份不得编造，须来自 `~/.aex-coder/users.json`；(3) 每条用户输入完整保留。

**选型：** 提案 1；用户附加**严格模式**（未绑定员工跳过发言）。

**交付物：** `docs/deliverables/collab-workshop-display/_artifacts/`

---

## 2. 方案

- `WorkshopMessage.reasoningContent` 与正文同条落盘；读取时合并 legacy `kind:'reasoning'`。
- UI：正文 → 可折叠思考 → 流式 `AgentProgressStream`（同卡片内）。
- `runOneRole` 前校验 users.json；`roleProps` 员工不用虚构昵称。

---

## 3. 方案选型过程

见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

见 `_artifacts/plan-collab-workshop-display.md`。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

`npm test -- tests/unittest/UT-collab-workshop tests/unittest/UT-workshop-agent-parity` — 27 passed。详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 单测：复合 reasoning、严格跳过、normalize、用户澄清保留
- 手工：待补充（截图场景：外部订单设计 + Agent 进度）

---

## 8. 代码审查

通过。见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/workshop/workshop-types.ts` | 修改 | reasoningContent |
| `electron/main/workshop/workshop-orchestrator.ts` | 修改 | 复合消息、严格绑定 |
| `electron/main/workshop/workshop-store.ts` | 修改 | normalize |
| `electron/main/workshop/workshop-user-bind.ts` | 新增 | 主进程绑定 |
| `WorkshopMessageItem.vue` | 修改 | 布局与进度槽 |
| `WorkshopPane.vue` | 修改 | 流式内嵌、身份 |
| `src/types/axecoder.d.ts` | 修改 | 类型 |
| `tests/unittest/UT-collab-workshop/*` | 修改 | 用例 |

---

## 10. 遗留项

- 设置中为后端/前端/测试配置 users.json 条目后协作才会四轮发言。
- P2：tool 摘要写入 reasoning 展示。

---

## 11. 附录：过程文档索引

| 文件 |
|------|
| `_artifacts/02-selection.md` |
| `_artifacts/proposal-collab-workshop-display.md` |
| `_artifacts/plan-collab-workshop-display.md` |
| `_artifacts/05-implement-report.md` |
| `_artifacts/05-unittest.md` |
| `_artifacts/06-code-review.md` |
