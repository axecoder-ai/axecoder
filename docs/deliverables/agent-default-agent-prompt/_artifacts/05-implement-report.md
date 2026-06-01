# 功能实现报告

## 功能说明

1. **§13 提示词**：`DEFAULT_AGENT_PROMPT`（AxeCoder 品牌）、`getDefaultAgentEnvNotesSection()`（Claude Code Notes 英文原文）、`buildDefaultSubAgentSystemPrompt()`（prompt + notes + `# Environment` + language + project root）。
2. **Agent 工具**：主 Agent 可调用 `Agent`，参数 `prompt`（必填）、`description`（可选）；内联 `runSubAgentTask` 最多 6 轮，返回 concise report 作为 tool result。
3. **子代理约束**：`SUB_AGENT_TOOLS` 排除 `Agent`、`AskUserQuestion`；`subAgentDepth` 禁止嵌套；子会话内 Write/Bash pending 自动 apply。

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/agent/agent-system-prompt.ts` | §13 常量与组装 |
| `electron/main/agent/agent-subagent.ts` | 子代理内联循环（新建） |
| `electron/main/agent/agent-tool-defs.ts` | Agent 工具定义、`SUB_AGENT_TOOLS` |
| `electron/main/agent/agent-types.ts` | `Agent` 工具名 |
| `electron/main/agent/tool-executor.ts` | Agent 分支、`AgentContext` 扩展 |
| `electron/main/agent/agent-loop.ts` | `ctx.modelId` |
| `electron/main/ai/chat-with-tools.ts` | 可选 `tools` 参数 |
| `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts` | §13 与 SUB_AGENT_TOOLS 单测 |

## 注意事项

- 子代理无独立 UI 进度；不注册 `agent-session-store`。
- 主会话 `buildAgentSystemPrompt` 未改，子代理不走主会话 §1–§12 全量提示。
