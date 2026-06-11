# create_plan + Plan Build UI 设计文档

## 当前背景

- `SwitchMode` / `planMode` 已实现；无 `CreatePlan`。
- `/create-plan` playbook 依赖 create_plan + 聊天 Build。
- `AskUserQuestion` 的 `ask_pending` 模式可复用为 `plan_pending`。

## 需求

### 功能需求

- Agent 工具 `CreatePlan`（`create_plan` 别名），planMode 下可用。
- 写 `docs/plans/plan-<slug>.md`（frontmatter `axecoder-plan: true`）。
- `plan_pending`：聊天卡片 Build / Dismiss。
- 编辑器打开 plan 文件时 Tab 栏 **Build**（共用 implement 注入）。
- Build：`ExitPlanMode` + `SwitchMode agent` + implement playbook + 计划路径。

### 非功能需求

- vitest 单测；最小改动。

## 实施阶段

### 阶段 1：后端（0.5d）

1. `agent-create-plan.ts` — 写文件、检测、compose implement 消息
2. `agent-types` / `tool-executor` — `plan_pending`
3. `agent-loop` — pending 循环、`buildAgentPlan` / `dismissAgentPlan`
4. `agent-ipc` + preload + 类型

### 阶段 2：前端（0.5d）

1. `ChatPlanCard.vue` + `ChatPane` 集成
2. `EditorPane` Build + `App.vue` 桥接
3. `buildPlanFromPath` 暴露方法

### 阶段 3：测试与交付

1. `UT-create-plan-build-ui`
2. rppit 交付物

## 文件变更

| 路径 | 操作 |
|------|------|
| `electron/main/agent/agent-create-plan.ts` | 新增 |
| `electron/main/agent/agent-types.ts` | 修改 |
| `electron/main/agent/tool-executor.ts` | 修改 |
| `electron/main/agent/agent-session-store.ts` | 修改 |
| `electron/main/agent/agent-loop.ts` | 修改 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 修改 |
| `electron/main/agent/agent-tool-aliases.ts` | 修改 |
| `electron/main/agent-ipc.ts` | 修改 |
| `electron/preload/index.ts` | 修改 |
| `src/types/axecoder.d.ts` | 修改 |
| `src/components/workbench/ChatPlanCard.vue` | 新增 |
| `src/components/workbench/ChatPane.vue` | 修改 |
| `src/components/workbench/EditorPane.vue` | 修改 |
| `src/App.vue` | 修改 |
| `tests/unittest/UT-create-plan-build-ui/` | 新增 |
