# 功能实现报告

## 功能说明

- Agent 上下文 compact 升级为 **LLM 摘要**：对被丢弃的中间消息序列化后调用 `chatWithProvider`（fast tier、无 tools）生成摘要，注入 `<system-reminder>` 占位消息。
- **自动 compact**：`prepareSessionBeforeModel` 超阈值时走 `compactAgentMessagesWithLlm`。
- **手动 IPC**：`agent:compactMessages` 支持传入 `modelId`/`sessionId` 触发 LLM 摘要。
- **回退**：无 modelId 或 LLM 失败时沿用规则统计摘要 `Dropped N older messages...`。
- **未改**：Renderer `chat-compact.ts` 与 `/compact` 斜杠仍规则截断。

## 修改文件列表

| 文件 | 变更 |
|------|------|
| `electron/main/agent/agent-context-compact.ts` | LLM 摘要核心、`compactAgentMessagesWithLlm` |
| `electron/main/agent/agent-loop.ts` | 自动 compact 改 async LLM |
| `electron/main/agent-ipc.ts` | IPC 异步 + modelId/sessionId |
| `tests/unittest/UT-llm-compact/llm-compact.test.ts` | 新增 UT |

## 单测覆盖

- LLM 成功 → `usedLlm: true`、摘要写入占位
- LLM 失败 → 规则回退
- tool 消息过长截断
- 回归 `UT-agent-runtime-gaps` 规则 compact 用例

## 注意事项

- 自动 compact 每轮可能多一次 LLM 调用（fast tier 降成本）。
- 摘要输入 transcript 上限 60k 字符；输出上限 8k 字符。
