# 功能实现报告

## 功能说明

Workshop 群聊成员 Agent 运行时，与主 Chat Agent 一致同时展示：
- 输出正文（流式或落库后的 `text`）
- `AgentProgressStream`（工具步骤 + Thinking 流式文本）

根因：`onWorkshopProgress` 在 `thinking` 时调用 `clearStreamUi()`，清空 `agent:progress` 累积，并回退为三点动画。

## 修改文件

| 文件 | 说明 |
|------|------|
| `src/components/workbench/WorkshopChatSection.vue` | `liveRoleId`/`showLiveAgentItem`；thinking 不清空 agent 进度 |
| `src/components/workbench/WorkshopMessageItem.vue` | 直播仅在有正文时显示气泡；`reasoningContent` 用 `AgentProgressStream` |

## 注意事项

- 纯 LLM 路由（无 `agentProgressActive`）仍显示三点 thinking。
- 与 ChatPane 差异：Workshop 进度嵌在角色消息行内（保留头像）。
