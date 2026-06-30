# Agent 系统提示 §11 动态段 — 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | agent-simple-dynamic-section |
| 完成日期 | 2026-06-01 |
| 选定方案 | 提案 1 – 边界 + 可落地动态段 |
| 审查结论 | 通过 |
| 单测 | 全绿（24/24） |

---

## 1. 概述

**需求：** 对齐 同类 Agent `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 之后的 §11 动态段，接入 AxeCoder `buildAgentSystemPrompt`。

**选型：** 提案 1（用户跳过 AskQuestion，采用推荐方案）；语言默认中文。

**交付目录：** `docs/deliverables/agent-simple-dynamic-section/`

---

## 2. 方案

- 静态段：§2–§10（不变）
- 动态段：session guidance → project memory（AGENTS.md/CLAUDE.md）→ env → language → summarize → 工具规则 → project root
- 边界常量仅用于结构，不发给模型

详见 `_artifacts/proposal-agent-simple-dynamic-section.md`

---

## 3. 方案选型过程

推荐提案 1；未实现 MCP/scratchpad/FRC。见 `_artifacts/02-selection.md`

---

## 4. 实施计划

单测 → 实现 §11 函数 → `async buildAgentSystemPrompt` → `agent-loop` 传参。见 `_artifacts/plan-agent-simple-dynamic-section.md`

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`

---

## 6. 单元测试执行情况

`npm test -- tests/unittest/UT-agent-system-prompt/ tests/unittest/UT-agent-glob/` — **24 passed，全绿**。见 `_artifacts/05-unittest.md`

---

## 7. 测试报告

- 自动化：Vitest 覆盖边界、language、env、memory、组装顺序
- 手工/集成：待补充（可选：打开项目含 AGENTS.md 跑 Agent 看 system 注入）

---

## 8. 代码审查

**通过**。见 `_artifacts/06-code-review.md`

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-system-prompt.ts` | 修改 | §11 动态段 + async 组装 |
| `electron/main/agent/agent-tool-defs.ts` | 修改 | re-export |
| `electron/main/agent/agent-loop.ts` | 修改 | await + modelId |
| `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts` | 修改 | §11 单测 |
| `tests/unittest/UT-agent-glob/agent-tool-defs.test.ts` | 修改 | async |

---

## 10. 遗留项与后续建议

- scratchpad 目录与 `getScratchpadInstructions`
- FRC 运行时 + prompt 段
- MCP instructions（待 MCP 接入）
- API `cacheScope: global` 分块（边界已预留）

---

## 11. 附录：过程文档索引

| 文件 |
|------|
| `_artifacts/00-research-links.md` |
| `_artifacts/02-selection.md` |
| `_artifacts/proposal-agent-simple-dynamic-section.md` |
| `_artifacts/plan-agent-simple-dynamic-section.md` |
| `_artifacts/05-implement-report.md` |
| `_artifacts/05-unittest.md` |
| `_artifacts/06-code-review.md` |
