# 功能实现报告：chat-image-paste

## 功能说明

- 聊天 / Workshop 输入框支持 **Ctrl+V 粘贴图片**，输入区显示缩略图芯片。
- 模型设置新增 **「支持视觉」** 开关；未开启时带图发送会被前端与 `ai:chat` / Agent / Workshop 拦截并提示。
- 图片落盘 `~/.axecoder/chat-attachments/{sessionId}/`，会话 JSON 仅存 `imageRefs`。
- 后端将 `AiChatMessage.images` 转为 OpenAI `content` 数组与 Anthropic image block；Agent 循环 user 消息同步支持。

## 修改文件（主要）

| 路径 | 说明 |
|------|------|
| `electron/main/chat-attachments.ts` | 新建：保存/解析粘贴图 |
| `electron/main/ai/ai-message-images.ts` | 新建：多模态 wire |
| `electron/main/models-types.ts` | `supportsVision`、`AiChatImagePart` |
| `electron/main/ai/openai-messages.ts` | user 多模态 wire |
| `electron/main/ai/providers/anthropic.ts` | Anthropic 图片块 |
| `electron/main/ai/providers/ollama.ts` | Ollama images 字段 |
| `electron/main/ai/chat-with-provider.ts` | vision 校验 |
| `electron/main/ai-ipc.ts` | `chat:savePastedImage`、`chat:resolveImageRefs` |
| `electron/main/agent-ipc.ts` / `agent-loop.ts` | Agent 传图 |
| `electron/main/workshop-ipc.ts` / `workshop-llm.ts` / `workshop-agent-speaker.ts` | Workshop 传图 |
| `src/composables/useChatAttachedImages.ts` | 粘贴 UI 逻辑 |
| `src/components/workbench/ChatPane.vue` | Chat 粘贴与发送 |
| `src/components/workbench/WorkbenchChatInput.vue` | 共用输入框 |
| `src/components/workbench/ModelFormDialog.vue` | supportsVision 开关 |
| `WorkshopPane.vue` / `WorkshopChatSection.vue` | Workshop 集成 |
| `electron/preload/index.ts` / `src/types/axecoder.d.ts` | IPC 与类型 |

## 注意事项

- 使用多模态前须在 **设置 → 模型** 为对应模型勾选「支持视觉」。
- 单张图片上限 8MB。
- 历史消息中的图片 V1 仅在输入区预览，气泡内显示文案「（图片）」若仅发图无字。
