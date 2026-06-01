# 实现报告

## 已实现能力

| 能力 | 实现 |
|------|------|
| Hooks | `~/.axecoder/hooks.json`；`agent-hooks.ts` Pre/PostToolUse、UserPromptSubmit；`/hooks` |
| 上下文自动压缩 | `agent-context-compact.ts`；超阈值自动 compact；`/compact` + `chat:compact` IPC |
| FRC | `agent-frc.ts` `clearOldToolResults` 每轮前清理旧 tool 内容 |
| `! <command>` | `ChatPane` + `agent:runUserShell` |
| Permission mode | `agent-permissions.ts`；config `agentPermissionMode` / allowed / disallowed；acceptEdits 自动 apply |
| Scratchpad | `~/.axecoder/scratchpad/<sessionId>/`；`ctx.scratchpadDir` |
| MCP instructions | `getMcpInstructionsSection` 写入 `buildAgentSystemPrompt` 动态段 |
| token_budget / brief | `getTokenBudgetSection` 每轮注入 system-reminder |
| Proactive | `agent-proactive.ts` 每 4 轮注入 check-in reminder |

## 主要文件

- `electron/main/agent/agent-{hooks,frc,context-compact,permissions,scratchpad,mcp-instructions,token-budget,proactive,user-shell}.ts`
- `electron/main/agent/agent-loop.ts` — 集成
- `electron/main/agent-ipc.ts` — IPC
- `electron/main/chat-compact.ts`
- `src/slash-commands/builtin.ts` — /help /clear /new /compact /hooks
- `src/components/workbench/ChatPane.vue` — `!` 前缀

## 配置（`~/.axecoder/config.json`）

- `agentPermissionMode`: `default` | `acceptEdits` | `bypassPermissions`
- `agentAllowedTools` / `agentDisallowedTools`
- `agentContextCompactThreshold`（默认 120000 字符）
- `agentFrcKeepToolMessages`（默认 8）
- `agentTokenBudget`、`agentProactiveEnabled`、`agentHooksEnabled`
