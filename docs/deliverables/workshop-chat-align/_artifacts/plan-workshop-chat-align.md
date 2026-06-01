# Workshop 对齐 Session Chat（纯对话）计划

## 需求

- 默认 speaker 改为 `buildLlmRoleSpeaker`
- LLM 路径支持 `ai:stream`（OpenAI）
- UI 去掉 Agentic/子代理暗示

## 文件

| 文件 | 操作 |
|------|------|
| `workshop-llm.ts` | onDelta + streamId |
| `workshop-ipc.ts` | 默认 llm speaker |
| `WorkshopPane.vue` | 文案 |
| `workshop-llm.test.ts` | 新增单测 |

## 步骤

1. 扩展 `buildLlmRoleSpeaker(modelId, workshopId, emitStream)`
2. ipc 替换 subagent 默认
3. 单测 + 全量 test
