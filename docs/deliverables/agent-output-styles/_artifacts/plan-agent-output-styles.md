# 计划：agent-output-styles

## 阶段 1 — 单测（红）

1. `agent-output-styles`：Default → null；Explanatory/Learning 含 `# Explanatory Style Active` / `# Learning Style Active`、`★ Insight`。
2. `getSimpleIntroSection(null)` vs 非 null 的 Output Style 分支。
3. `buildAgentSystemPrompt`：Explanatory 时含 `# Output Style: Explanatory`，顺序在 `# Language` 之后、`SUMMARIZE` 之前。

## 阶段 2 — 实现

1. 新建 `agent-output-styles.ts`（英文 prompt 与 Claude 原文一致，符号用 `★` / `•`）。
2. 改 `agent-system-prompt.ts`：`getSimpleIntroSection(config)`、`buildAgentSystemPrompt` options `outputStyleId`。
3. `config-store` + 类型 + `agent-loop` 传参。
4. `GeneralTab` 下拉 + `useWorkbench` 默认。

## 阶段 3 — 验收

- 全量相关单测绿；落盘 `05-implement-report.md`、`05-unittest.md`。
