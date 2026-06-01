# 选型记录

## 2a 选型摘要

**需求：** 1:1 实现 Claude Code §13 `DEFAULT_AGENT_PROMPT` + `enhanceSystemPromptWithEnvDetails` Notes；身份 AxeCoder；并具备最小 Agent 子代理委派能力。

| 维度 | 提案 1 仅提示词 | 提案 2 提示词 + Agent 工具 |
|------|----------------|---------------------------|
| 核心思路 | 导出子代理 system prompt 组装函数，主会话不变 | 同上 + Agent 工具触发内联子会话 |
| 改动范围 | `agent-system-prompt.ts` + 单测 | 另含 `agent-subagent.ts`、`chat-with-tools`、`tool-executor`、`agent-loop` |
| 优点 | 最小、无嵌套风险 | 端到端可委派子任务 |
| 缺点 | 运行时无法委派 | 子代理无 UI 进度；嵌套一层 |
| 工作量 | 小 | 中 |
| 适合场景 | 仅对齐文档 | 需要主 Agent 派发子任务 |

**推荐：** 提案 1（与 §2–§12 一致）。用户显式选择提案 2。

## 2b 用户选择

- **选定：** 提案 2 – 提示词 + 最小 Agent 工具
- **调整：** 无额外调整
