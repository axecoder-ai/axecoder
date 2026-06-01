**状态：** 已确认

## 已确认方案

- **选定：** 提案 2 – 独立 `agent-tool-prompts.ts` + 工厂组装
- **调整：** strict — 各工具 `description` 与参数 `description` 尽量加长，覆盖 Claude Code §14 要点与 AxeCoder `tool-executor` 真实行为；不编造未实现参数（如 Read offset/limit）。

### 最终方案

- 新建 `electron/main/agent/agent-tool-prompts.ts`：为 `Read`、`Edit`、`Write`、`Glob`、`Grep`、`Delete`、`Move`、`Bash`、`Agent`、`AskUserQuestion` 导出完整 `AgentToolDef`。
- `agent-tool-defs.ts`：`AGENT_TOOLS = buildAgentTools()`，`SUB_AGENT_TOOLS` 逻辑不变。
- 单测 `tests/unittest/UT-agent-tool-level-prompts/`：每工具断言关键英文规则短语；`description` 长度下限（strict）。
- **不做：** TodoWrite、WebFetch、Skill、MCP。

**验证：** `npm test -- tests/unittest/UT-agent-tool-level-prompts/ tests/unittest/UT-agent-glob/ tests/unittest/UT-agent-system-prompt/`
