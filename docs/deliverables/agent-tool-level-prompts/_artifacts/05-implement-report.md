# 功能实现报告 — agent-tool-level-prompts

## 功能说明

对齐 Claude Code §14：为 AxeCoder 全部 10 个 Agent 内置工具提供 API 级长 `description` 与参数 `description`，经 `chat-with-tools` 映射到 OpenAI/Anthropic `tools[]`。

## 修改文件

| 文件 | 变更 |
|------|------|
| `electron/main/agent/agent-tool-prompts.ts` | 新增：`buildAgentTools()` + 各工具长描述常量 |
| `electron/main/agent/agent-tool-defs.ts` | `AGENT_TOOLS = buildAgentTools()`，re-export `buildAgentTools` |
| `tests/unittest/UT-agent-tool-level-prompts/agent-tool-level-prompts.test.ts` | 新增：工具齐全、strict 长度、关键短语 |

## 单测覆盖

- 10 工具名与 `buildAgentTools` 一致
- strict：`description` 长度 Bash/Agent ≥800，其余 ≥400
- Read/Edit/Bash/Agent/AskUserQuestion/Glob/Grep 关键规则短语

## 注意事项

- 无 Claude Code `prompt.ts` 源码，长文按 §7/§13 + `tool-executor` 行为撰写，非逐字节 1:1
- 未实现工具（TodoWrite、WebFetch 等）不在范围
