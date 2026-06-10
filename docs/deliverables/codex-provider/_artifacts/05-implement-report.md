# 功能实现报告 — codex-provider

## 功能说明

新增第四模型 Provider **`codex`**，对接 OpenAI **Responses API**（`POST /v1/responses`），支持：

- Plain chat（`chatCodex`）
- Agent 工具调用（`chatCodexWithTools`）
- SSE 流式 content / reasoning / function_call 参数
- Settings → Models 下拉 **Codex (Responses)**
- Agent / Workshop / 聊天 IPC 流式与 openai 同级

V1 采用 stateless：`store: false`，每轮发送完整 `input[]`；system 映射为 `developer`。

## 修改文件列表

| 路径 | 说明 |
|------|------|
| `electron/main/models-types.ts` | `codex` 枚举 + helper |
| `electron/main/ai/responses-messages.ts` | wire + output 解析 |
| `electron/main/ai/responses-sse.ts` | Responses SSE 合并 |
| `electron/main/ai/providers/codex.ts` | chat + tools |
| `electron/main/ai/parse-token-usage.ts` | `parseResponsesUsage` |
| `electron/main/ai/chat-with-provider.ts` | codex 分支 |
| `electron/main/ai/chat-with-tools.ts` | codex 分支 |
| `electron/main/ai-ipc.ts` | codex 流式 |
| `electron/main/agent/agent-loop.ts` | codex 流式 delta |
| `electron/main/workshop/workshop-llm.ts` | codex 流式 |
| `src/types/axecoder.d.ts` | 类型 |
| `src/components/workbench/ModelFormDialog.vue` | UI |
| `src/components/workbench/ChatPane.vue` | SSE |
| `tests/unittest/UT-codex-provider/*` | 单测 |

## 单测覆盖

- URL 构建
- system→developer、tool wire、output 解析
- SSE delta 合并
- mock fetch chat / tools

## 注意事项

- 需 OpenAI API Key 且模型支持 Responses/Codex
- V1 未实现 vision wire；`supportsVision` 仍走 guard
- 非 OpenAI Chat Completions 网关请继续用 `openai` Provider
