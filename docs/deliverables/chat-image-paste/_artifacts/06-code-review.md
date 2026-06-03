# 代码审查：chat-image-paste

## 结论

**通过**（无阻塞项）

## 功能

- 粘贴 → 落盘 → 发送时解析为 API parts，与已确认方案一致。
- Chat / Workshop / Agent 三条路径均有 vision 校验。

## 质量

- 类型与 wire 转换有单测；复用 `useChatAttachedImages` 减少重复。
- 会话不内联 base64，体积可控。

## 非阻塞待办

- 历史消息气泡加载 `imageRefs` 缩略图预览。
- Ollama 非视觉模型错误信息依赖 API 原文，可后续细化。

## 安全

- 路径 segment 消毒；单图 8MB 限制；仅 `~/.axecoder` 下读写。
