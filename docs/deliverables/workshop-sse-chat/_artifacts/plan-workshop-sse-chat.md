# Workshop SSE 流式（提案 2）设计文档

> 依据：`docs/proposals/proposal-workshop-sse-chat.md`（已确认）

## 当前背景

- Chat：`ai:stream` + `ChatPane.streamText`。
- Workshop：子代理完成后一次性 `pushMessage`；仅 thinking 动画。

## 需求

### 功能需求（P0）

- W1：`streamId = workshop-{workshopId}-{roleId}`。
- W2：`runSubAgentTask` 支持 `onDelta`，OpenAI 时 `emitAiStream`。
- W3：`WorkshopPane` 过滤 `onAiStream`，流式气泡 + 结束后写入历史消息。
- W4：`speaking` 在角色 LLM 开始前触发；`done` 后清空 `streamText`。

### 非功能需求

- 与 Chat 同时打开不误收（前缀过滤）。
- scripted speaker 无流式（单测路径不变）。

## 设计决策

### 1. 流式通道

复用 `ai:stream`，不扩展 `workshop:progress` payload。

### 2. 编排时序

`thinking` → `speaking`（开始流）→ speaker → `pushMessage` → `done`（清 UI 流）。

## 技术设计

### 文件变更

| 文件 | 操作 |
|------|------|
| `electron/main/workshop/workshop-stream.ts` | 新增 streamId 工具 |
| `electron/main/agent/agent-subagent.ts` | onDelta |
| `electron/main/workshop/workshop-subagent-speaker.ts` | 转发 emit |
| `electron/main/workshop/workshop-orchestrator.ts` | speaking 提前 |
| `electron/main/workshop-ipc.ts` | 绑定 emitAiStream |
| `src/utils/workshop-stream.ts` | 前端前缀 |
| `src/components/workbench/WorkshopPane.vue` | onAiStream |
| `WorkshopMessageItem.vue` | streaming 样式 |
| `tests/unittest/UT-workshop-sse-chat/` | 单测 |

## 实施计划

1. 单测 streamId + orchestrator speaking 顺序。
2. 实现 subagent onDelta + ipc emit。
3. WorkshopPane 流式 UI。
4. 跑全量相关单测。

## 测试策略

- `workshop-stream.test.ts`：id 格式与 parse。
- 更新 `workshop-orchestrator.test.ts`：mock speaker 验证 progress 顺序。
