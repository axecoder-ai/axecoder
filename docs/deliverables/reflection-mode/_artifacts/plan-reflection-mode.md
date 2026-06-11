# Reflection 反思模式 实施计划

**状态：** 待实施  
**依据：** `docs/proposals/proposal-reflection-mode.md`（已确认）、`docs/prd/reflection-mode-prd.md`

## 当前背景

- `reflection` 已在类型与后端存在，但被 `DISABLED_CHAT_MODES` 隐藏，无编排逻辑。
- Multi-Agent 已通过 `ma-{chatId}` + Workshop 嵌入 + `sendWorkshopMessage` 跑通。
- PRD 要求固定 Dev→TL→Reviewer→TL 循环，TL 纯文字，最多 3 轮。

## 需求摘要

### 功能
- 开放 Reflection 模式选择器
- 嵌入 Workshop 面板，发消息走 Reflection 编排
- 新建 `reflection-turn-orchestrator.ts`
- IPC/前端透传 `orchestrationChatMode`
- reflection ↔ multi-agent 互斥；可切回 Agent 等

### 非功能
- 复用 Workshop 流式、进度、角色 Agent 发言
- 单测覆盖编排顺序与模式锁定

## 设计决策

### 1. 独立编排器
新建 `reflection-turn-orchestrator.ts`，`workshop-ipc` 按 `chatMode === 'reflection'` 分支，不修改 `coordinator-turn-engine` 主循环。

### 2. Tech Lead 纯文字
通过 `buildWorkshopRouterLlm`（无工具）+ JSON prompt 实现短评与轮次判断，消息 `roleId: 'manager'`。

### 3. UI 泛化
`isWorkshopEmbeddedInAgentChat` = multi-agent | reflection，复用 `syncMultiAgentWorkshop` 逻辑。

## 实施阶段

### 阶段 1：模式开放（前端 + 后端镜像）
- [ ] `src/utils/chat-modes.ts`：移除禁用、加选项、扩展 `canPickChatMode`
- [ ] `electron/main/agent/chat-mode.ts`：同步开放、更新 addon
- [ ] 单测 `UT-chat-mode-lock`

### 阶段 2：Reflection 编排器
- [ ] 新建 `electron/main/workshop/reflection-turn-orchestrator.ts`
- [ ] 导出 `parseReflectionRoundJudge`、`sendReflectionMessage`、`scriptedReflectionJudgeLlm`
- [ ] 单测 `UT-reflection-orchestrator`

### 阶段 3：IPC 与前端透传
- [ ] `workshop-ipc.ts`：`orchestrationChatMode` 分支
- [ ] preload + `axecoder.d.ts` + `useWorkbenchSession.ts`
- [ ] `WorkshopChatSection.vue`：prop 透传
- [ ] `ChatPane.vue`：泛化 embedded 模式

### 阶段 4：验收
- [ ] 全量单测通过
- [ ] 实现报告与审查

## 文件变更清单

| 文件 | 类型 |
|------|------|
| `electron/main/workshop/reflection-turn-orchestrator.ts` | 新增 |
| `tests/unittest/UT-reflection-orchestrator/reflection-turn-orchestrator.test.ts` | 新增 |
| `src/utils/chat-modes.ts` | 修改 |
| `electron/main/agent/chat-mode.ts` | 修改 |
| `electron/main/workshop-ipc.ts` | 修改 |
| `electron/preload/index.ts` | 修改 |
| `src/types/axecoder.d.ts` | 修改 |
| `src/composables/useWorkbenchSession.ts` | 修改 |
| `src/components/workbench/WorkshopChatSection.vue` | 修改 |
| `src/components/workbench/ChatPane.vue` | 修改 |
| `tests/unittest/UT-chat-mode-lock/chat-mode-lock.test.ts` | 修改 |
