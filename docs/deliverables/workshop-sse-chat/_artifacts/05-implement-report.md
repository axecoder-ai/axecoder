# 功能实现报告：Workshop SSE 流式（提案 2）

## 功能说明

Collab Workshop 各角色发言时复用主聊天 **`ai:stream`** 通道，按 `workshop-{workshopId}-{roleId}` 推送 OpenAI SSE 增量；`WorkshopPane` 订阅 `onAiStream` 显示多角色流式气泡（含光标），体验与普通聊天一致。`workshop:progress` 仍负责 thinking / speaking / done；`speaking` 提前到子代理调用前触发。

## 修改文件列表

| 文件 | 说明 |
|------|------|
| `electron/main/workshop/workshop-stream.ts` | streamId 构建与解析 |
| `electron/main/agent/agent-subagent.ts` | `RunSubAgentOptions.onDelta` |
| `electron/main/workshop/workshop-subagent-speaker.ts` | 转发 ai:stream |
| `electron/main/workshop/workshop-orchestrator.ts` | speaking 时序 |
| `electron/main/workshop-ipc.ts` | `emitAiStream` 绑定 |
| `src/utils/workshop-stream.ts` | 渲染端前缀过滤 |
| `src/components/workbench/WorkshopPane.vue` | onAiStream + 流式 UI |
| `src/components/workbench/WorkshopMessageItem.vue` | streaming 样式 |
| `tests/unittest/UT-workshop-sse-chat/workshop-stream.test.ts` | 新增 |
| `tests/unittest/UT-collab-workshop/workshop-orchestrator.test.ts` | speaking 顺序 |
| `tests/unittest/UT-collab-workshop/workshop-subagent-speaker.test.ts` | onDelta 断言 |

## 单测覆盖

- streamId 往返、前端角色解析
- orchestrator：`speaking` 早于 speaker 执行
- subagent speaker：传入 `onDelta` 回调

## 注意事项

- 仅 OpenAI provider 有 token 级流式；其他模型结束后整段显示（与 Chat 一致）
- Chat 与 Workshop 并行时靠 `workshop-` 前缀隔离，Chat 勿使用该前缀
- scripted 模式无流式
