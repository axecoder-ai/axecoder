# Agent 系统提示 §11 动态段

**状态：** 已确认

**选定：** 提案 1 – 边界 + AxeCoder 可落地动态段  
**调整：** 语言段默认 `中文`

## 概述

在 `agent-system-prompt.ts` 引入 `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`（仅用于组装顺序，不写入最终 prompt 字符串），将 §8 `session_guidance` 及后续段移到边界之后；新增：

- `loadProjectMemoryPrompt` — 读项目根 `AGENTS.md`、`CLAUDE.md`
- `computeSimpleEnvInfo` — 工作目录、git、平台、Shell、OS、modelId
- `getLanguageSection` — 默认 `中文`
- `SUMMARIZE_TOOL_RESULTS_SECTION` — §11 常量

不实现：MCP、Output Style、scratchpad、FRC 运行时、token_budget、brief、Ant 段。

## 组装顺序（§15 + §11）

静态：intro → system → doing → actions → using → tone → output efficiency  
动态：session guidance → memory → env → language → summarize → AxeCoder tool rules → project root

## 影响文件

- `electron/main/agent/agent-system-prompt.ts`
- `electron/main/agent/agent-loop.ts`
- `electron/main/agent/agent-tool-defs.ts`
- `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts`
- `tests/unittest/UT-agent-glob/agent-tool-defs.test.ts`

## 验证

`npm test -- tests/unittest/UT-agent-system-prompt/ tests/unittest/UT-agent-glob/`
