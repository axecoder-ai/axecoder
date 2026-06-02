# agent-explore-orchestration 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | agent-explore-orchestration |
| 完成日期 | 2026-06-02 |
| 选定方案 | 提案 1（Claude 对齐 · Chat-only） |
| 审查结论 | 通过 |
| 单测 | 全绿（232/232） |

---

## 1. 概述

**需求：** 缩小 AxeCoder Chat Agent 与 Claude Code 在同类任务上的工具调用差距（避免 100+ 次无效 Read/Grep）。

**本轮目标：** 对齐 Claude 的 **软编排**（非强制两阶段状态机）：Todo 回灌、Explore 委派指引、FRC/scratchpad 说明、explore 报告落盘。

**选型：** 用户确认 **提案 1（p1-claude）**，范围 **仅 Chat**，Workshop 不动。

**交付物目录：** `docs/deliverables/agent-explore-orchestration/` · 过程稿 `_artifacts/`

---

## 2. 方案

已确认方案要点：

- `getTodoManagementSection` / `getAgentDelegationSection`（`EXPLORE_AGENT_MIN_QUERIES = 3`）
- 每轮 `<agent-context-injection>` 注入 Todo + `explore-summary.md`
- `Agent(explore)` 成功写 scratchpad
- Chat `buildAgentSystemPrompt` 带 scratchpad 路径与 FRC 保留条数

全文见 [_artifacts/proposal-agent-explore-orchestration.md](./_artifacts/proposal-agent-explore-orchestration.md)

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 思路 | Prompt + 每轮注入 | 强制 explore→implement |
| 与 Claude | 一致（Claude 无 Chat 硬阶段机） | AxeCoder 增强 |
| 范围 | Chat（用户选定） | 含 Workshop 门控 |

**推荐：** 提案 1。用户经 Claude 源码补研后确认 **p1-claude + chat-only**。

详见 [_artifacts/02-selection.md](./_artifacts/02-selection.md)

---

## 4. 实施计划

阶段：单测 → prompt 段 → 注入循环 → TodoWrite/explore 落盘 → 全量测试。

全文见 [_artifacts/plan-agent-explore-orchestration.md](./_artifacts/plan-agent-explore-orchestration.md)

---

## 5. 实现说明

- 新增 `agent-context-inject.ts`
- 扩展 `agent-system-prompt.ts`、`agent-loop.ts`
- `tool-executor` explore 写 `explore-summary.md`

详见 [_artifacts/05-implement-report.md](./_artifacts/05-implement-report.md)

---

## 6. 单元测试执行情况

`npm test` — **53 files, 232 tests, 全绿**

详见 [_artifacts/05-unittest.md](./_artifacts/05-unittest.md)

---

## 7. 测试报告

- **自动化：** 见 §6
- **手工：** 建议用「仿现有页面实现新页面」类 prompt 对比改前/后 `toolLog.length`（待产品验收）

---

## 8. 代码审查

**通过**，无阻塞。待办：Workshop 共享 explore 摘要、久未 TodoWrite 提醒。

详见 [_artifacts/06-code-review.md](./_artifacts/06-code-review.md)

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-context-inject.ts` | 新增 | Todo/scratchpad 注入 |
| `electron/main/agent/agent-system-prompt.ts` | 修改 | Claude 对齐 prompt 段 |
| `electron/main/agent/agent-loop.ts` | 修改 | 每轮注入 + Chat prompt 参数 |
| `electron/main/agent/agent-ext-executor.ts` | 修改 | TodoWrite 文案 |
| `electron/main/agent/tool-executor.ts` | 修改 | explore → scratchpad |
| `tests/unittest/UT-agent-explore-orchestration/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

- Workshop 四角色重复探索 → 另开任务共享 `explore-summary.md`
- Claude 式「N 轮未 TodoWrite」轻提醒 → `attachments` 等价逻辑
- 手工验证 tool 步数是否下降 50%+

---

## 11. 附录：过程文档索引

| 文件 |
|------|
| [_artifacts/00-research-links.md](./_artifacts/00-research-links.md) |
| [_artifacts/02-selection.md](./_artifacts/02-selection.md) |
| [_artifacts/proposal-agent-explore-orchestration.md](./_artifacts/proposal-agent-explore-orchestration.md) |
| [_artifacts/plan-agent-explore-orchestration.md](./_artifacts/plan-agent-explore-orchestration.md) |
| [_artifacts/05-implement-report.md](./_artifacts/05-implement-report.md) |
| [_artifacts/05-unittest.md](./_artifacts/05-unittest.md) |
| [_artifacts/06-code-review.md](./_artifacts/06-code-review.md) |
