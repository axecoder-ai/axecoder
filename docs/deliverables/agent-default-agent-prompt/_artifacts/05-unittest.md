# 单元测试

## 命令

```bash
npm test -- tests/unittest/UT-agent-system-prompt/ tests/unittest/UT-agent-glob/
```

## 结果

- **状态：** 全绿
- **Test Files：** 3 passed
- **Tests：** 33 passed（含新增 4 个 §13 相关用例）

## 新增用例摘要

- `DEFAULT_AGENT_PROMPT` AxeCoder 身份与 concise report
- `getDefaultAgentEnvNotesSection` absolute paths / load-bearing / emojis / colon
- `buildDefaultSubAgentSystemPrompt` 组装结构
- `SUB_AGENT_TOOLS` 不含 Agent、AskUserQuestion
