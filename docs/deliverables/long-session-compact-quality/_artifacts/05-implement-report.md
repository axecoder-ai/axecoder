# 功能实现报告

## 功能说明

1. **先摘要后 FRC**：`prepareSessionBeforeModel` 超阈值时先 LLM compact（tool 内容完整），再 `clearOldToolResults`。
2. **滚动摘要**：`StoredAgentSession.rollingCompactSummary`；多轮 compact 将 `priorSummary` 送入 LLM 合并。
3. **`extractPriorCompactSummary`**：从既有 compact 占位消息提取旧摘要作回退。
4. **Chat `/compact` LLM 化**：`compactChatHistoryWithLlm` + `chat:compact` 接受 `modelId`/`sessionId`；斜杠传会话模型。

## 修改文件列表

| 文件 | 说明 |
|------|------|
| `electron/main/agent/agent-context-compact.ts` | priorSummary、extractPriorCompactSummary |
| `electron/main/agent/agent-loop.ts` | FRC/compact 顺序、rollingCompactSummary |
| `electron/main/agent/agent-session-store.ts` | rollingCompactSummary 字段 |
| `electron/main/chat-compact.ts` | compactChatHistoryWithLlm |
| `electron/main/agent-ipc.ts` | chat:compact LLM |
| `electron/preload/index.ts` | chatCompact 签名 |
| `src/types/axecoder.d.ts` | 类型 |
| `src/slash-commands/builtin.ts` | /compact 传 modelId |
| `tests/unittest/UT-long-session-compact-quality/` | 新增 5 条 UT |

## 单测覆盖

- priorSummary 进入 LLM prompt
- extractPriorCompactSummary
- Chat LLM 成功/规则回退
- 回归 UT-llm-compact

## 注意事项

- Chat 会话无 tool 消息，质量提升主要在 Agent 自动 compact。
- LLM 失败仍回退规则摘要；无 modelId 时 Chat 走规则版。
