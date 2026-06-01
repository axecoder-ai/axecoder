---
任务名: agent-simple-output-efficiency-section
完成日期: 2026-06-01
选定方案: 提案 1
审查: 通过
单测: 12/12 全绿
---

# 交付总结 — §10 Output efficiency

## 概述

对齐 Claude Code `getOutputEfficiencySection`（外部版），约束 Agent **文字输出**要简洁、先给结论、少复述用户。

## 方案

- 标题 `# Output efficiency` + IMPORTANT 直奔主题 + Focus 三条 + 一句规则。
- 组装：`… → tone → **output efficiency** → session guidance → …`

## 选型 / 计划 / 实现 / 单测 / 审查

见 `_artifacts/` 下 `02-selection.md`、`plan-*.md`、`05-*`、`06-code-review.md`。

## 变更清单

| 路径 | 说明 |
|------|------|
| `electron/main/agent/agent-system-prompt.ts` | §10 + 组装 |
| `electron/main/agent/agent-tool-defs.ts` | re-export |
| `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts` | 单测 |

## 遗留

§11 动态段（memory、env、language、MCP 等）。

## 附录

`_artifacts/00-research-links.md`、`02-selection.md`、`proposal-*.md`、`plan-*.md`、`05-implement-report.md`、`05-unittest.md`、`06-code-review.md`
