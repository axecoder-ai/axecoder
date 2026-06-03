## 已确认解决方案提案

**状态：** 已确认

**上下文：**
- **请求：** Workshop 与 Agent 对齐：同时显示输出与 Thinking/工具步骤。
- **选定基础：** 提案 1 – 修复 Workshop 进度互斥
- **调整：** 保留角色头像行

### 最终方案

1. `onWorkshopProgress` 在 `status === 'thinking'` 且已 `agentProgressActive` 时**不再** `clearStreamUi()`。
2. 直播项使用 `liveRoleId = streamRoleId ?? thinkingRole`，在 `agentProgressActive` 时始终渲染 `AgentProgressStream`。
3. 无 Agent 绑定时仍用三点 `thinking` 气泡。
4. 历史消息 `reasoningContent` 用 `AgentProgressStream` 展开展示（替代折叠「思考过程」）。

### 验证

- 单测：`tests/unittest/UT-collab-workshop/` 全绿
- 手工：Workshop 成员发言可见步骤 + Thinking 文本 + 正文
