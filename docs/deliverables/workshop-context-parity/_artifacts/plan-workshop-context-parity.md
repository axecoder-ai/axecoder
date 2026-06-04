# workshop-context-parity 实施计划

**状态：** 已确认方案 `docs/proposals/proposal-workshop-context-parity.md`

## 阶段 1 – 上下文管道

1. `formatMemberChatSummary`：气泡 `summary` 含实质结论（截断 ~1000 字）+ 文件列表；完整 report 进 `reasoningContent`。
2. `priorSummaryFromMessages`：每行合并 `text` + 可选 `reasoningContent` 摘录；上限调至 12000。
3. `runMemberSpeak` / `runManagerSpeak`：`pushMessage` 写入 `reasoningContent`。
4. `workshop-agent-speaker`：透传 `reasoningContent`。

## 阶段 2 – Prompt 与路由

1. `buildRoleTaskPrompt` member：允许简短结论 + 路径，去掉「仅 Done」硬限。
2. `workshop-router`：`buildManagerTurnPrompt` / `routeTurnAfterMember` 注入 `lastMemberExcerpt`。
3. 新增 `lastMemberContextFromMessages` 辅助函数。

## 阶段 3 – Tech Lead 读码

1. `runManagerCodeBrief`：派活前 `speaker` + `speakMode: 'manager_chat'`，只读工具。
2. `agent-loop`：`manager_chat` 使用 `filterToolsForSubagent(..., 'explore')`。
3. 读码结论写入 hidden system 或 manager `reasoningContent`，供后续 JSON 路由。

## 阶段 4 – 多模态与模型同步

1. 确认 `pendingUserImages` 在 manager_chat / member 均传入 `runWorkshopRoleAgentTurn`。
2. `WorkshopChatSection` / `ChatPane`：multi-agent 打开时 `modelId = activeModelId`。

## 阶段 5 – 单测

1. 扩展 `UT-collab-workshop` 或新增 `UT-workshop-context-parity`：priorSummary、formatMemberChatSummary。
2. 跑相关 workshop 单测全绿。
