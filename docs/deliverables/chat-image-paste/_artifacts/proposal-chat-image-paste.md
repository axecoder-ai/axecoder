# 已确认方案：聊天粘贴图片（多模态）

**状态：** 已确认

**选定：** 提案 1 – 落盘附件 + `supportsVision` 开关  
**范围：** Chat 面板、Workshop 输入框、Agent 模式均需支持传图

## 目标

用户在输入框 **Ctrl+V / 粘贴** 图片；模型配置开启「支持视觉」时，将图片随用户消息发往 OpenAI 兼容 / Anthropic API；未开启时前端与后端均拦截并提示。

## 关键设计

1. **存储：** `~/.axecoder/chat-attachments/{sessionId}/{id}.ext`，消息 JSON 仅存 `imageRefs`（id、mimeType、storagePath）。
2. **类型：** `AiChatMessage.images?: { mimeType, data }[]`（data 为 base64）；`ChatMessage.imageRefs`；`ModelEntry.supportsVision?: boolean`。
3. **Wire：** `ai-message-images.ts` 将 user 消息转为 OpenAI `content` 数组（text + image_url）与 Anthropic image block；Agent `AgentLoopMessage` user 分支同步支持 `images`。
4. **Workshop：** `workshop:sendMessage` 增加 `imageRefs`，主进程解析后写入 session 临时字段，供 `workshop-llm` 注入 user 消息。
5. **校验：** 含图且 `!model.supportsVision` 时拒绝发送。

## 验证

- 单测：wire 转换、附件读写、vision 校验
- 手工：OpenAI 多模态模型粘贴截图；非 vision 提示；Agent 模式带图发送

## 未纳入

- Ollama 多模态完整适配（supportsVision 时尝试 OpenAI 式 images 字段，失败由 API 报错）
- 聊天历史气泡内联缩略图（V1 仅输入区预览 + 文案标记）
