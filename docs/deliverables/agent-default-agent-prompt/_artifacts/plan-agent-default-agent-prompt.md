# Agent 默认子代理（§13）实施计划

**desired_location:** `docs/plans/plan-agent-default-agent-prompt.md`

## 当前背景

- 主 Agent 已有 `buildAgentSystemPrompt`（§2–§12）。
- 无子代理提示与 Agent 工具。

## 需求

### 功能需求

1. `DEFAULT_AGENT_PROMPT`（AxeCoder 品牌）与 §13 Notes 英文原文。
2. `buildDefaultSubAgentSystemPrompt(projectRoot, options?)`。
3. `Agent` 工具：`prompt`（必填）、`description`（可选）；返回子代理 concise report。
4. 子代理：最多 6 轮；工具 = 主集去掉 `Agent`、`AskUserQuestion`；pending 写/Bash 自动 apply。

### 非功能需求

- 禁止子代理再调 `Agent`（`subAgentDepth`）。
- 最小 diff；不新增 IPC/UI。

## 实施计划

| # | 任务 | 文件 |
|---|------|------|
| 1 | 提示词常量与组装 | `agent-system-prompt.ts` |
| 2 | `SUB_AGENT_TOOLS`、`Agent` 定义 | `agent-tool-defs.ts`、`agent-types.ts` |
| 3 | 可选 tools 参数 | `chat-with-tools.ts` |
| 4 | 子循环 | `agent-subagent.ts` |
| 5 | Agent 执行分支 + `ctx.modelId` | `tool-executor.ts`、`agent-loop.ts` |
| 6 | Vitest | `agent-system-prompt.test.ts` |

## 验证

`npm test -- tests/unittest/UT-agent-system-prompt/ tests/unittest/UT-agent-glob/`
