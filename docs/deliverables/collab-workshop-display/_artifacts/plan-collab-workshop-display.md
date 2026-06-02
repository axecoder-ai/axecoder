# collab-workshop-display 设计文档

## 当前背景

- `collab-think-fold` 将思考落为独立 `kind:'reasoning'` 条，且排在 summary 之前；进度流在列表底部独立 `ws-agent-progress`。
- AI 昵称回退 `WORKSHOP_ROLE_UI`（王经理等）与 users.json 冲突。
- 乐观更新 + `startWorkshopRun` 可能重复 push 用户条。

## 需求

### 功能需求

1. 单条员工消息：`text`（正文）+ 可选 `reasoningContent`（展示在正文**下方**、默认折叠）。
2. 流式 Agent 进度显示在该角色消息卡片内正文下方。
3. 员工展示身份仅来自 `listUsers` / `findUserForWorkshopRole`；无绑定则跳过该角色发言。
4. 每条用户输入均 `pushMessage` 落盘；避免与乐观 UI 重复。

### 非功能需求

- 读取旧 workshop JSON 时自动合并 legacy reasoning 条。

## 设计决策

### 1. 数据模型

`WorkshopMessage.reasoningContent?: string`；新写入不再产生 `kind:'reasoning'`。

### 2. 严格绑定

`runOneRole` 前 `listUsers` + `findUserForWorkshopRole`；缺失则 `system` 提示并 `nextEmployeePhase` 跳过。

### 3. UI

`WorkshopMessageItem`：bubble → reasoning toggle → optional `AgentProgressStream` slot。

## 实施计划

1. 类型与 `normalizeWorkshopMessages`（store 读取时）
2. 编排 `pushMessage` 合并 reasoning；用户 push 去重
3. 主进程 `workshop-user-bind.ts`
4. Vue 组件与 `roleProps` 收紧
5. 单测更新并全绿

**desired_location:** `docs/plans/plan-collab-workshop-display.md`
