# 功能实现报告

## 功能说明

Workshop 群聊完全重做：

1. **Turn 编排**：`workshop-turn-orchestrator` 取代拆步/验收；`workshop-router` 负责 AI 选角、话语权路由、经理派活。
2. **API 角色**：`workshop-api-messages.workshopApiRole` — BOSS+经理 `user`，成员 `assistant`。
3. **IPC**：新增 `workshop:sendMessage`；`startRun`/`sendUserAnswer` 转发至同一逻辑。
4. **Legacy**：`getWorkshopSession` 加载时 `stripLegacyWorkshopFields` 清除 stepPlan。
5. **前端 Facade**：`useWorkbenchSession` + `workshop-message-adapter`；`WorkshopChatSection` 嵌入 `ChatPane`；`App.vue` 移除中央 `WorkshopPane`。
6. **BOSS 身份**：群聊 UI 使用 profile 昵称/头像。

## 修改文件列表

| 文件 | 变更 |
|------|------|
| `electron/main/workshop/workshop-turn-orchestrator.ts` | 新增 |
| `electron/main/workshop/workshop-router.ts` | 新增 |
| `electron/main/workshop/workshop-router-llm.ts` | 新增 |
| `electron/main/workshop/workshop-api-messages.ts` | 新增 |
| `electron/main/workshop/workshop-orchestrator.ts` | 替换为 re-export |
| `electron/main/workshop/workshop-types.ts` | phase/speakMode 简化 |
| `electron/main/workshop/workshop-store.ts` | strip legacy |
| `electron/main/workshop/workshop-ipc.ts` | sendMessage |
| `electron/main/workshop/workshop-subagent-speaker.ts` | member 模式 |
| `electron/main/workshop/workshop-agent-speaker.ts` | stream key |
| `electron/main/agent/agent-loop.ts` | speakMode 类型 |
| `src/composables/useWorkbenchSession.ts` | 新增 |
| `src/utils/workshop-message-adapter.ts` | 新增 |
| `src/components/workbench/WorkshopChatSection.vue` | 新增 |
| `src/components/workbench/ChatPane.vue` | sessionKind 分支 |
| `src/App.vue` | 共用 Chat 列 |
| `electron/preload/index.ts` | workshopSendMessage |
| `src/types/axecoder.d.ts` | 类型更新 |
| `tests/unittest/UT-collab-workshop/*` | 新/删单测 |

## 单测覆盖

- router JSON 解析、API role、turn 循环、澄清挂起、adapter

## 注意事项

- 生产环境路由依赖 LLM JSON 输出质量；测试用 `scriptedRouterLlm`。
- `WorkshopPane.vue` 仍保留于仓库但未挂载，可后续删除。
- Workshop 模式隐藏 Agent tabs，整 pane 为群聊 UI。
