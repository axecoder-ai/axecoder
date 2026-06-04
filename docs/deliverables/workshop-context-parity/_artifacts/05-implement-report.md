# 功能实现报告 — workshop-context-parity

## 功能说明

1. **加厚跨角色上下文**：`priorSummaryFromMessages` 合并 `reasoningContent`（上限 12k）；`formatMemberChatSummary` 气泡保留实质结论。
2. **成员 prompt**：允许结论 + 路径，不再强制仅 `Done.`。
3. **Tech Lead 读码**：派活前 `runManagerCodeBrief`（`manager_chat` + explore 只读工具），摘要写入 hidden system 并注入 JSON 路由。
4. **路由**：`routeTurnAfterMember` / `buildManagerTurnPrompt` 注入成员详情摘录。
5. **多模态**：发送成功后清空 `pendingUserImages`；图片仍经 `getUserImages()` 传入各角色 turn。
6. **模型同步**：`WorkshopChatSection` 接受 `preferredModelId`，Multi-Agent 嵌入时与 Agent `activeModelId` 一致。

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/workshop/workshop-display.ts` | `summarizeReportForChat`、`formatManagerCodeBrief` |
| `electron/main/workshop/workshop-api-messages.ts` | priorSummary、lastMemberContext |
| `electron/main/workshop/workshop-turn-orchestrator.ts` | 读码、reasoning 落盘 |
| `electron/main/workshop/workshop-router.ts` | 路由 prompt 参数 |
| `electron/main/workshop/workshop-subagent-speaker.ts` | manager_chat / member prompt |
| `electron/main/workshop/workshop-agent-speaker.ts` | 读码展示、reasoning 透传 |
| `electron/main/workshop/workshop-user-skills.ts` | manager_chat 技能 |
| `electron/main/agent/agent-loop.ts` | manager_chat 只读工具集 |
| `electron/main/workshop-ipc.ts` | 清空 pending 图片 |
| `src/components/workbench/WorkshopChatSection.vue` | preferredModelId |
| `src/components/workbench/ChatPane.vue` | 传入 activeModelId |
| `tests/unittest/UT-workshop-context-parity/*` | 新增单测 |

## 注意事项

- Tech Lead 每轮派活前多一次只读 Agent 回合，延迟与 token 会增加。
- 提案 2（统一持久 session）未实施。
