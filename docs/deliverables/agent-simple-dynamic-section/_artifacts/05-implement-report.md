# 功能实现报告 — §11 动态段

## 功能说明

- 引入 `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`（组装分界，不写入模型可见 prompt）。
- 静态段保持 §2–§10；动态段：`session_guidance` → `loadProjectMemoryPrompt` → `computeSimpleEnvInfo` → `getLanguageSection`（默认中文）→ `SUMMARIZE_TOOL_RESULTS_SECTION` → AxeCoder 工具路径规则 → project root。
- `buildAgentSystemPrompt` 改为 `async`；`agent-loop` 传入 `modelId` 与 `enabledToolNames`。

## 修改文件

| 文件 | 变更 |
|------|------|
| `electron/main/agent/agent-system-prompt.ts` | 边界常量、§11 段函数、组装 |
| `electron/main/agent/agent-tool-defs.ts` | re-export |
| `electron/main/agent/agent-loop.ts` | await + options |
| `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts` | §11 与顺序单测 |
| `tests/unittest/UT-agent-glob/agent-tool-defs.test.ts` | async 调用 |

## 未做范围

MCP、Output Style、scratchpad、FRC 运行时、token_budget、brief、Ant 段。

## 注意事项

- 记忆文件：项目根 `AGENTS.md`、`CLAUDE.md`（只读拼接）。
- API 分块缓存（`cacheScope: global`）未接，边界仅为结构对齐。
