# 实施计划：Thinking 过程实时输出

**desired_location:** `docs/plans/plan-thinking-live-progress.md`

## 当前背景

- Agent 模式后端已发送 `thinking_delta` / `content_delta`，但 `ChatPane` 调用的 `agentStore.appendThinking` 不存在，Thinking 区无内容。
- Workshop 模式 agent-loop 仅发送合并 `delta`（content），reasoning 被丢弃。
- `AgentProgressStream` 已有 thinking 展示槽位；`ThinkingPanel` 本轮不集成。

## 需求

### 功能需求

1. 修复 agentStore API，ChatPane 能流式展示 reasoning。
2. Workshop agent progress 同样支持 `thinking_delta` / `content_delta`。
3. 会话结束时清空 thinking 状态。
4. 工具步骤保持现有 progressSteps 展示（已有 tool name + summary）。

### 非功能需求

- 最小改动；不引入 ThinkingPanel 大组件。
- 单测覆盖 agentStore 新 API。

## 设计决策

### 1. agentStore 扩展

在现有 `addThinkingDelta` 基础上增加 ChatPane 期望的薄封装：`appendThinking`、`currentThinking`（computed 字符串）、`thinkingType`、`setThinkingType`。

### 2. detectThinkingType 前端复用

在 `src/utils/thinking-parser.ts` 增加 `detectThinkingType`（与 backend 逻辑一致），ChatPane/WorkshopPane 改从前端 import，避免 renderer 引用 electron/main。

### 3. Workshop agent-loop

Workshop 分支改为与 Agent 相同：分别 emit `content_delta` 与 `thinking_delta`；保留 `delta` 向后兼容可选（WorkshopPane 已可处理 content_delta）。

## 文件变更

| 文件 | 变更 |
|------|------|
| `src/stores/agentStore.ts` | 新增 appendThinking/currentThinking/thinkingType API |
| `src/utils/thinking-parser.ts` | 新增 detectThinkingType |
| `src/components/workbench/ChatPane.vue` | import 路径调整 |
| `src/components/workbench/WorkshopPane.vue` | 处理 thinking_delta/content_delta；传 thinking 到 live-progress |
| `src/components/workbench/WorkshopMessageItem.vue` 或相关 | 展示 thinkingText（若 live-progress 支持） |
| `electron/main/agent/agent-loop.ts` | Workshop 发送 thinking_delta |
| `tests/unittest/UT-thinking-output/agentStore.test.ts` | 补 appendThinking 测试 |
| `tests/unittest/UT-thinking-output/thinking-parser.test.ts` | detectThinkingType 测试（若无则新建） |

## 实施计划

1. **单测**：agentStore.appendThinking、detectThinkingType
2. **agentStore + thinking-parser**
3. **agent-loop Workshop 分支**
4. **ChatPane + WorkshopPane + 进度 UI 传参**
5. **跑 vitest 全量 UT-thinking-output**

## 测试策略

- `npm test -- tests/unittest/UT-thinking-output`
- 手工：Agent 聊天观察 Thinking 区流式文字；Workshop 角色发言同理

## 已知限制

- 仅 OpenAI provider 有 reasoning 流；其他 provider 仍仅工具步骤可见。
