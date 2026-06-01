## 已确认解决方案提案

**状态：** 已确认

**上下文：**
- **请求：** 1:1 实现 Claude Code §13 默认子代理提示 + 最小 Agent 工具子会话。
- **调研来源：** `claude-code/docs/claude-code-system-prompts-full.md` §13；`00-research-links.md`
- **选定基础：** 提案 2
- **用户调整摘要：** 无；身份句 AxeCoder。

### 最终方案 – 默认子代理提示 + Agent 工具

- **概述：** 新增 `DEFAULT_AGENT_PROMPT`、`getDefaultAgentEnvNotesSection`、`buildDefaultSubAgentSystemPrompt`（含 Notes + `computeSimpleEnvInfo`）。`AGENT_TOOLS` 增加 `Agent`；`agent-subagent.ts` 内联子循环（`MAX_SUB_TURNS=6`，工具集不含 `Agent`/`AskUserQuestion`，写操作与 Bash 自动执行）。`chat-with-tools` 支持可选 tools 列表。主会话 `ctx.modelId` 供 Agent 工具调用。

- **关键变更：**
  - `electron/main/agent/agent-system-prompt.ts`
  - `electron/main/agent/agent-subagent.ts`（新建）
  - `electron/main/agent/agent-tool-defs.ts`、`agent-types.ts`
  - `electron/main/agent/tool-executor.ts`、`agent-loop.ts`
  - `electron/main/ai/chat-with-tools.ts`
  - `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts`

- **验证：** `npm test -- tests/unittest/UT-agent-system-prompt/`

- **待解决问题：** 内置 Explore/Plan 类型、子代理 UI 进度、resume。
