# 单元测试：chat-image-paste

## 命令

```bash
npm test -- --run tests/unittest/UT-chat-image-paste tests/unittest/UT-openai-messages tests/unittest/UT-workshop-chat-align/workshop-llm.test.ts tests/unittest/UT-workshop-agent-parity/workshop-agent-speaker.test.ts
```

## 结果

- **Test Files:** 6 passed
- **Tests:** 12 passed
- **状态:** 全绿

## 覆盖点

- `ai-message-images`：OpenAI / Anthropic wire、hasImages 检测
- `chat-attachments`：落盘与 base64 解析
- `openai-messages`：user images → content 数组
- Workshop speaker 签名兼容
