# 功能实现报告 — session-auto-title

## 功能说明

Agent 对话会话在侧栏列表中的名称会随对话推进自动更新为主题摘要：

1. **首条发送**：仍用用户首句截断（24 字）替换 `New Agent` / `新对话` 占位。
2. **约两轮后**（≥4 条 user/assistant 消息）且 title 仍为占位（默认名、与首句相同、短问候如「你好」）时，主进程用当前模型的 **fast API** 生成 6–16 字中文主题。
3. 生成成功后写回 session 与 `sessions/index.json`；非占位 title 不覆盖。

## 修改文件

| 文件 | 说明 |
|------|------|
| `electron/main/session/session-title.ts` | 占位判定、prompt、LLM 调用 |
| `electron/main/session/session-ipc.ts` | `session:suggestTitle` |
| `electron/preload/index.ts` | `suggestChatSessionTitle` |
| `src/types/axecoder.d.ts` | 类型 |
| `src/components/workbench/ChatPane.vue` | `persist` 后异步刷新标题 |
| `tests/unittest/UT-session-auto-title/session-title.test.ts` | 单测 |
| `tests/unittest/UT-agent-bulk/agent-bulk.test.ts` | mock 补 `modelId`（与双 API 改动对齐） |

## 单测覆盖

- 占位判定、`shouldSuggest`、标题解析、prompt 构建
- mock `chatWithProvider` 的成功路径

## 注意事项

- 需已配置模型且 API 可用；失败时保持占位标题，不打扰用户。
- Workshop 会话本期未接入。
- 本期无手动重命名 UI。
