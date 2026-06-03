# Workshop 输出与思考对齐 设计文档

**desired_location:** `docs/plans/plan-workshop-thinking-align.md`

## 需求

Workshop 成员 Agent 发言时 UI 与主 Chat Agent 一致：正文 + `AgentProgressStream`（步骤 + Thinking 流）。

## 设计

- 修 `WorkshopChatSection` 进度事件与 `liveRoleId` 计算。
- `WorkshopMessageItem`：`reasoningContent` → `AgentProgressStream`；直播时无正文则仅显示进度块。

## 任务

1. [x] 修 `onWorkshopProgress` 不清空 agent 进度
2. [x] 统一 `showLiveAgentItem` 模板条件
3. [x] 历史 reasoning 用 `AgentProgressStream`
4. [x] 回归 `UT-collab-workshop`
