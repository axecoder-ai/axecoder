# Agent §11 动态段 — 实施计划

## 阶段 1：单测

- 断言 `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 存在；最终 prompt **不含**边界字面量
- `getLanguageSection('中文')`、`SUMMARIZE_TOOL_RESULTS_SECTION`、`computeSimpleEnvInfo`
- `loadProjectMemoryPrompt` 读临时目录 AGENTS.md
- `buildAgentSystemPrompt` 顺序：output efficiency 之后为 session → memory → env → language → summarize → tool rules

## 阶段 2：实现

1. 新增常量与段函数
2. `buildAgentSystemPrompt` 改为 `async`，options：`modelId`、`languagePreference`、`projectMemory`、`enabledToolNames`
3. `agent-loop` `await buildAgentSystemPrompt(..., { modelId, enabledToolNames })`

## 阶段 3：验证

`npm test -- tests/unittest/UT-agent-system-prompt/ tests/unittest/UT-agent-glob/`
