# plan-chat-image-paste

## 阶段一：类型与主进程

1. `chat-attachments.ts` — 保存/读取 base64
2. `ai-message-images.ts` — OpenAI / Anthropic wire
3. 扩展 `AiChatMessage`、`ModelEntry`、`AgentLoopMessage`
4. `ai-ipc`：`chat:savePastedImage`、`chat:resolveImageRefs`；`ai:chat` vision 校验
5. `agent-ipc` 传递 images

## 阶段二：前端

1. `ModelFormDialog` — supportsVision 开关
2. `WorkbenchChatInput` — paste、图片 chips、props `sessionId` + `attachedImages`
3. `ChatPane` — 同上（自有 input-box）
4. `WorkshopPane` / `WorkshopChatSection` — 传 sessionId 与 imageRefs

## 阶段三：Workshop 后端

1. `workshop-types` — `pendingUserImages`
2. `workshop-ipc` + `workshop-llm` 注入 images

## 阶段四：测试

- `UT-chat-attachments`、`UT-ai-message-images`、更新 `openai-messages.test.ts`
