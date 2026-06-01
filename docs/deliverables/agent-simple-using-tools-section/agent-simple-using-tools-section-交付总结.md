# agent-simple-using-tools-section 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | agent-simple-using-tools-section |
| 完成日期 | 2026-06-01 |
| 选定方案 | 提案 1 |
| 调整 | 保留 §7 Bash 原文 + 实现 Agent Bash 工具 |
| 审查 | 通过 |
| 单测 | 19/19 全绿 |

---

## 1. 概述

1:1 接入 Claude Code §7 `getUsingYourToolsSection` 主段，并实现 Agent **`Bash`** 工具（项目根执行 shell 命令）。

## 2. 方案

- §7：Read/Edit/Write/Glob/Grep vs Bash、并行/顺序调用。
- `runAgentBash` + 工具注册与执行器。
- 组装顺序对齐 §15。

## 3. 选型

提案 1；用户要求实现 Bash 工具。见 `_artifacts/02-selection.md`。

## 4–8. 实现 / 单测 / 审查

见 `_artifacts/05-implement-report.md`、`05-unittest.md`、`06-code-review.md`。

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-system-prompt.ts` | 修改 | §7 |
| `electron/main/agent/agent-bash.ts` | 新增 | Bash 执行 |
| `electron/main/agent/agent-types.ts` | 修改 | Bash 类型 |
| `electron/main/agent/agent-tool-defs.ts` | 修改 | Bash 定义 |
| `electron/main/agent/tool-executor.ts` | 修改 | Bash 分支 |
| `tests/unittest/UT-agent-system-prompt/` | 修改 | §7 测试 |
| `tests/unittest/UT-agent-bash/` | 新增 | Bash 单测 |

## 10. 遗留

- §8 `getSessionSpecificGuidanceSection`
- Bash 高风险命令专用确认 UI（可选）

## 11. 附录

`_artifacts/`：`00-research-links.md`、`02-selection.md`、`proposal-*.md`、`plan-*.md`、`05-*`、`06-*`
