# 功能实现报告

## 功能说明

1. **§5 `getSimpleDoingTasksSection()`**：同类 Agent 全员英文 bullet 1:1 接入（不含 Ant 内部、产品帮助段）。
2. **`getAgentToolPathRulesSection()`**：原 `AGENT_DOING_TASKS_SECTION` 更名，保留 AxeCoder 工具路径规则。
3. **`buildAgentSystemPrompt`**：顺序 intro → system → doing tasks → tool rules → project root。
4. **`AskUserQuestion` 工具**：参数校验、会话 `pendingAskById` 暂停、`agent:answerQuestions` IPC、Chat 面板 `ChatAskUserCard` 提交答案后继续循环。

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/agent/agent-system-prompt.ts` | §5 + 工具规则段拆分 |
| `electron/main/agent/agent-types.ts` | AskUser 类型、pendingAsks |
| `electron/main/agent/agent-tool-defs.ts` | 工具定义与 re-export |
| `electron/main/agent/tool-executor.ts` | parse + ask_pending |
| `electron/main/agent/agent-session-store.ts` | pendingAskById |
| `electron/main/agent/agent-loop.ts` | 暂停/作答继续 |
| `electron/main/agent-ipc.ts` | answerQuestions |
| `electron/preload/index.ts` | agentAnswerQuestions |
| `src/types/axecoder.d.ts` | 前端类型 |
| `src/components/workbench/ChatAskUserCard.vue` | 问答 UI |
| `src/components/workbench/ChatPane.vue` | 接入 pendingAsks |
| `tests/unittest/UT-agent-system-prompt/` | §5 与顺序断言 |
| `tests/unittest/UT-agent-ask-user/` | AskUser 解析单测 |

## 注意事项

- 存在 `pendingAsks` 时不自动 `agentAutoApplyWrites`，避免用户未答题就应用写盘。
- §6/§7 系统提示仍为后续项。
