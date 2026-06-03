# Workshop 群聊重做 设计文档

**desired_location:** `docs/plans/plan-workshop-redesign.md`

## 当前背景

- 现有 Workshop 使用 `workshop-orchestrator` 拆步/验收/redo，复杂且未跑通。
- UI 上 `WorkshopPane` 占中央，与 Agent `ChatPane` 割裂。
- `session-registry` 已统一 `agent | workshop` 列表。

## 需求

### 功能需求

1. Turn 编排：BOSS 发话 → AI 选接话人 → 成员 Agent 发言 → AI 路由（澄清/经理/结束）→ 经理派活 → 成员立刻发言。
2. BOSS 仅 AskUserQuestion 时暂停；profile 标识 BOSS。
3. LLM API：BOSS+经理 `user`，成员 `assistant`。
4. 共用 ChatPane；Workshop 按钮进入；经理判定结束。
5. no_legacy：加载时清除 stepPlan 相关字段。

### 非功能需求

- 编排比旧版简单、可单测。
- Workshop 与 Agent 数据隔离。

## 设计决策

### 1. 编排层

新写 `workshop-turn-orchestrator` + `workshop-router`（JSON 输出），删除旧 plan/verify 主路径。

### 2. 前端

`useWorkbenchSession` Facade 统一 load/send；`WorkshopChatSection` 嵌入 ChatPane；App 去掉中央 Workshop 布局。

### 3. 存储

保留 `workshops/*.json`；`getWorkshopSession` 时 strip legacy。

## 技术设计

### 核心组件

- `workshop-router.ts`：`pickNextSpeaker` / `routeTurnAfterMember` / `runManagerTurn`（LLM + parse）
- `workshop-turn-orchestrator.ts`：`sendWorkshopMessage` 驱动 turn 循环
- `workshop-api-messages.ts`：`workshopApiRole`、历史摘要
- `useWorkbenchSession.ts`：按 kind 分发 IPC

### 文件变更

| 文件 | 类型 |
|------|------|
| `electron/main/workshop/workshop-router.ts` | 新增 |
| `electron/main/workshop/workshop-turn-orchestrator.ts` | 新增 |
| `electron/main/workshop/workshop-api-messages.ts` | 新增 |
| `electron/main/workshop/workshop-types.ts` | 修改 |
| `electron/main/workshop/workshop-subagent-speaker.ts` | 修改 |
| `electron/main/workshop/workshop-store.ts` | 修改 |
| `electron/main/workshop/workshop-ipc.ts` | 修改 |
| `electron/main/workshop/workshop-orchestrator.ts` | 删除/替换 |
| `src/composables/useWorkbenchSession.ts` | 新增 |
| `src/utils/workshop-message-adapter.ts` | 新增 |
| `src/components/workbench/WorkshopChatSection.vue` | 新增 |
| `src/components/workbench/ChatPane.vue` | 修改 |
| `src/App.vue` | 修改 |
| `electron/preload/index.ts` | 修改 |
| `src/types/axecoder.d.ts` | 修改 |
| `tests/unittest/UT-collab-workshop/*` | 修改/新增 |

## 实施计划

### 阶段一：后端编排（TDD）

1. 单测 router 解析 + API role 映射
2. 实现 `workshop-router.ts`、`workshop-api-messages.ts`
3. 单测 turn orchestrator（scripted router/speaker）
4. 实现 `workshop-turn-orchestrator.ts`
5. 改 IPC、store strip legacy、types

### 阶段二：前端 Facade

1. `workshop-message-adapter` + 单测
2. `useWorkbenchSession` composable
3. `WorkshopChatSection.vue`
4. ChatPane + App 集成

### 阶段三：清理

1. 移除 App 中央 WorkshopPane 引用
2. 更新/删除旧 orchestrator 单测
3. 跑全量 workshop 单测

## 测试策略

### 单元测试

- `workshop-router.test.ts`：JSON parse、非法输入
- `workshop-turn-orchestrator.test.ts`：完整 scripted turn、澄清、结束
- `workshop-api-messages.test.ts`：role 映射
- `workshop-message-adapter.test.ts`：消息转换

### 手工

Workshop 按钮 → 发任务 → 观察多角色发言 → 澄清 → 结束

## 已知限制

- V1 不自动写盘；Workshop 模式隐藏 Agent slash
- 旧 workshop 会话 stepPlan 被丢弃
