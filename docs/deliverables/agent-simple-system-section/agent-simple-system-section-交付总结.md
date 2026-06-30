# agent-simple-system-section 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | agent-simple-system-section |
| 完成日期 | 2026-06-01 |
| 选定方案 | 提案 1 – 英文原文 `getSimpleSystemSection()` |
| 审查结论 | 通过 |
| 单测 | 全绿（10/10） |

---

## 1. 概述

在 AxeCoder Agent 系统提示中 **1:1 接入** 同类 Agent `getSimpleSystemSection`（§4），并按 §15 置于 `getSimpleIntroSection` 与工具规则之间。

**选型：** 推荐并选定提案 1（英文原文）；无额外调整。

**交付物目录：** `docs/deliverables/agent-simple-system-section/`（过程稿在 `_artifacts/`）。

---

## 2. 方案

- 新增 `getSimpleSystemSection()`，§4 六条 bullet 英文原文。
- `buildAgentSystemPrompt`：`intro` → `system` → `AGENT_DOING_TASKS_SECTION` → `Project root`。
- `agent-tool-defs.ts` re-export。

全文见 `_artifacts/proposal-agent-simple-system-section.md`。

---

## 3. 方案选型过程

对比提案 1（1:1 原文）与提案 2（裁剪 Hooks/permission）。用户选定提案 1，无调整。

详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

单测先行 → 实现 `getSimpleSystemSection` → 跑 Vitest。

详见 `_artifacts/plan-agent-simple-system-section.md`。

---

## 5. 实现说明

- `electron/main/agent/agent-system-prompt.ts`：新增函数并接入组装。
- `electron/main/agent/agent-tool-defs.ts`：re-export。
- `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts`：§4 要点 + 顺序断言。

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

```bash
npm test -- tests/unittest/UT-agent-system-prompt/ tests/unittest/UT-agent-glob/
```

**3 files / 10 tests 全通过。**

详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 单元测试：已覆盖 §4 关键句与 intro/system/doing-tasks 顺序。
- 手工 Agents 面板回归：待补充（非阻塞）。

---

## 8. 代码审查

**结论：通过。** 无阻塞项；§5+ 段落为后续项。

详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-system-prompt.ts` | 修改 | `getSimpleSystemSection` + 组装 |
| `electron/main/agent/agent-tool-defs.ts` | 修改 | re-export |
| `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts` | 修改 | 单测扩展 |
| `docs/deliverables/agent-simple-system-section/**` | 新增 | rppit 交付物 |

---

## 10. 遗留项与后续建议

- 对齐 §5 `getSimpleDoingTasksSection`、§6 `getActionsSection` 等。
- 产品实现工具审批 / Hooks 后，可再核对 §4 文案与行为一致性。

---

## 11. 附录：过程文档索引

| 文件 |
|------|
| `_artifacts/00-research-links.md` |
| `_artifacts/02-selection.md` |
| `_artifacts/proposal-agent-simple-system-section.md` |
| `_artifacts/plan-agent-simple-system-section.md` |
| `_artifacts/05-implement-report.md` |
| `_artifacts/05-unittest.md` |
| `_artifacts/06-code-review.md` |
