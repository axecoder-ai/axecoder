# agent-simple-doing-tasks-section 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | agent-simple-doing-tasks-section |
| 完成日期 | 2026-06-01 |
| 选定方案 | 提案 1 – 独立 `getSimpleDoingTasksSection()` + 工具规则独立段 |
| 用户调整 | 实现 `AskUserQuestion` 工具与 UI |
| 审查结论 | 通过 |
| 单测 | 全绿（14/14） |

---

## 1. 概述

在 AxeCoder Agent 系统提示中 **1:1 接入** 同类 Agent `getSimpleDoingTasksSection`（§5 全员），并按 §15 置于 system 段与工具路径规则之间；同时实现 `AskUserQuestion` 结构化问答工具闭环。

**选型：** 推荐并选定提案 1；用户要求实现 AskUserQuestion。

**交付物目录：** `docs/deliverables/agent-simple-doing-tasks-section/`（过程稿在 `_artifacts/`）。

---

## 2. 方案

- 新增 `getSimpleDoingTasksSection()`（§5 全员英文，不含 Ant/产品帮助）。
- `getAgentToolPathRulesSection()` 承接原工具路径 6 条。
- `AskUserQuestion`：工具定义、执行暂停、`agentAnswerQuestions`、Chat 卡片 UI。

全文见 `_artifacts/proposal-agent-simple-doing-tasks-section.md`。

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 结构 | §5 与工具规则分函数 | 合并单段 |
| 演进 | 对齐 §15，便于 §7 | diff 小但难扩展 |

用户选定提案 1，并要求实现 AskUserQuestion。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

单测先行 → §5 提示词 → AskUserQuestion 后端 → Chat UI → Vitest 验收。

详见 `_artifacts/plan-agent-simple-doing-tasks-section.md`。

---

## 5. 实现说明

- `electron/main/agent/agent-system-prompt.ts`：`getSimpleDoingTasksSection`、`getAgentToolPathRulesSection`。
- Agent 循环与 IPC：`pendingAsks`、`answerAgentQuestions`。
- `src/components/workbench/ChatAskUserCard.vue` + `ChatPane.vue`。

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

```bash
npm test -- tests/unittest/UT-agent-system-prompt/ tests/unittest/UT-agent-glob/ tests/unittest/UT-agent-ask-user/
```

**4 files / 14 tests 全通过。**

详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 单元测试：§5 关键句、组装顺序、AskUser 参数解析。
- 手工：Agents 模式触发 AskUserQuestion 并提交选项 — 待补充（非阻塞）。

---

## 8. 代码审查

**结论：通过。** 无阻塞项。§6/§7 为后续项。

详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-system-prompt.ts` | 修改 | §5 + 工具规则拆分 |
| `electron/main/agent/agent-types.ts` | 修改 | AskUser / pendingAsks 类型 |
| `electron/main/agent/agent-tool-defs.ts` | 修改 | AskUserQuestion 工具 |
| `electron/main/agent/tool-executor.ts` | 修改 | 解析与 ask_pending |
| `electron/main/agent/agent-session-store.ts` | 修改 | pendingAskById |
| `electron/main/agent/agent-loop.ts` | 修改 | 暂停与作答 |
| `electron/main/agent-ipc.ts` | 修改 | answerQuestions IPC |
| `electron/preload/index.ts` | 修改 | 暴露 API |
| `src/types/axecoder.d.ts` | 修改 | 前端类型 |
| `src/components/workbench/ChatAskUserCard.vue` | 新增 | 问答 UI |
| `src/components/workbench/ChatPane.vue` | 修改 | pendingAsks |
| `tests/unittest/UT-agent-system-prompt/` | 修改 | §5 测试 |
| `tests/unittest/UT-agent-ask-user/` | 新增 | AskUser 测试 |

---

## 10. 遗留项与后续建议

- 对齐 §6 `getActionsSection`、§7 `getUsingYourToolsSection`。
- 会话持久化后重开时 `pendingAsks` 恢复策略。
- Agents 面板手测 AskUserQuestion 全流程。

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型 | `_artifacts/02-selection.md` |
| 提案 | `_artifacts/proposal-agent-simple-doing-tasks-section.md` |
| 计划 | `_artifacts/plan-agent-simple-doing-tasks-section.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 审查 | `_artifacts/06-code-review.md` |
