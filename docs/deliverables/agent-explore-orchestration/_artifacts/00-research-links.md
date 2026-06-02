# 调研链接

## AxeCoder

- `docs/research/research-axecoder-vs-claude-code.md`
- `electron/main/agent/agent-loop.ts` — `prepareSessionBeforeModel`
- `electron/main/agent/agent-frc.ts` — `clearOldToolResults`（占位清理，非 Claude 的 cache-editing microcompact）
- `electron/main/agent/agent-todo-store.ts` — Todo 未每轮回灌
- `electron/main/agent/agent-scratchpad.ts` — 目录已有，system prompt 未强调
- `electron/main/agent/agent-system-prompt.ts` — §7 缺 TodoWrite/Agent 子段

## Claude Code（本地快照 `/Users/cuiyunfeng/workspace/claude-code`）

| 能力 | 路径 | 要点 |
|------|------|------|
| Explore 子代理 | `src/tools/AgentTool/built-in/exploreAgent.ts` | 只读；强调并行 Grep/Read；默认 haiku；`disallowedTools` 含 Edit/Write |
| Agent 何时用 explore | `src/constants/prompts.ts` `getSessionSpecificGuidanceSection` | 简单搜索用 Glob/Grep；**>3 次查询**或深度探索才 `Agent(subagent_type=Explore)` |
| TodoWrite | `src/tools/TodoWriteTool/TodoWriteTool.ts` | 写入 `AppState.todos`；tool 结果提醒继续用 todo |
| Todo 回灌 | `src/utils/attachments.ts` `getTodoReminderAttachments` | 每轮 attachment → `todo_reminder` system-reminder，**带当前 todo 列表** |
| §7 Using tools | `prompts.ts` `getUsingYourToolsSection` | 含 Task/Todo 拆解、**并行 tool call** 原文 |
| FRC | `microCompact.ts` + `getFunctionResultClearingSection` | 保留最近 N 条；提示模型在 assistant 文本中先记下要点 |
| Scratchpad | `getScratchpadInstructions()` | 动态段：禁止 /tmp，会话隔离目录 |

**结论：** Claude **没有**普通 Chat 的硬编码 Explore→Implement 状态机；靠 **提示词 + Explore 子代理类型 + Todo attachment + microcompact/FRC 说明** 降步数。与 AxeCoder「提案 2 全状态机」不完全一致。
