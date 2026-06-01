# 实现报告 — workshop-chat-align

## 功能

Workshop 默认改为 **Session Chat 纯对话路径**（`chatWithProvider` / `ai:chat` 同级），不再默认 `runSubAgentTask` 子代理。OpenAI 模型继续经 `workshop-{id}-{role}` 走 `ai:stream` 流式。

## 修改文件

| 文件 | 说明 |
|------|------|
| `electron/main/workshop/workshop-llm.ts` | 默认 speaker + SSE onDelta |
| `electron/main/workshop-ipc.ts` | `buildLlmRoleSpeaker` 替换 subagent |
| `src/components/workbench/WorkshopPane.vue` | 标识 Agentic→Chat |
| `tests/unittest/UT-workshop-chat-align/workshop-llm.test.ts` | 新增 |

## 注意

- **无 Read/Grep 工具**；研究代码请用主 Chat Agent 模式。
- `workshop-subagent-speaker.ts` 保留供单测，非默认路径。
