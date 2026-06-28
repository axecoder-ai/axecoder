# 多 Session 并发 — 功能实现报告

## 功能说明

- 多 Agent Session 可后台并行：`clientChatId` 随 `agent:send` 传入主进程，progress 精确路由到对应 chat
- 移除 `assignmentQueue` 猜绑；`resolveProgressChatId` 仅认 `clientChatId` 或已建立的 `agentToChat`
- 普通聊天 SSE 按 `chatId` 隔离（`Map` 订阅）；`finishRunUi` 只解绑当前 chat
- Tab 栏：running / pending / completed-unread 圆点；running Tab 可一键 Stop（含后台 Session）
- `chat_mode` progress 仅影响当前激活 Tab

## 修改文件

| 文件 | 说明 |
|------|------|
| `src/utils/chat-progress-route.ts` | 新增 progress 路由纯函数 |
| `src/composables/useChatSessionRuns.ts` | 路由、chat_mode/scroll 守卫、endRun 清理 agentToChat |
| `src/components/workbench/ChatPane.vue` | SSE Map、Tab dot/stop、sendAgent 传 clientChatId |
| `src/utils/agent-progress.ts` | `clientChatId` 可选字段 |
| `electron/main/agent/agent-session-store.ts` | StoredAgentSession.clientChatId |
| `electron/main/agent/agent-loop.ts` | startAgentTurn 接收并下发 clientChatId |
| `electron/main/agent-ipc.ts` | agent:send 透传 clientChatId |
| `electron/preload/index.ts` | preload 签名 |
| `src/types/axecoder.d.ts` | agentSend 类型 |
| `tests/unittest/UT-chat-session-runs/chat-progress-route.test.ts` | 路由单测 |

## 注意事项

- 非激活 Tab 仍不展示完整进度流，仅圆点 + Stop
- Workshop 嵌入模式未单独改造
