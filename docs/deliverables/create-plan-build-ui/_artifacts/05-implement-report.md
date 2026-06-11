# create_plan + Plan Build UI — 功能实现报告

## 功能说明

- 新增 Agent 工具 **CreatePlan**（别名 `create_plan`），仅在 **planMode** 下可用。
- 调用后写入 `docs/plans/plan-<slug>.md`（frontmatter `axecoder-plan: true`），并进入 **plan_pending** 阻塞状态。
- **ChatPane** 展示 `ChatPlanCard`：Build / Dismiss。
- **EditorPane** 打开 plan 文件时 Tab 栏显示 **Build**，经 `ChatPane.buildPlanFromPath` 注入 implement playbook 并发起 Agent 回合。
- **Build** 行为：`ExitPlanMode` 语义 + `SwitchMode(agent)` + 内置 `/implement` playbook + 计划全文。

## 修改文件列表

| 文件 | 说明 |
|------|------|
| `electron/main/agent/agent-create-plan.ts` | 计划写盘、检测、implement 消息合成 |
| `electron/main/agent/agent-types.ts` | CreatePlan、PendingPlanPublic |
| `electron/main/agent/tool-executor.ts` | CreatePlan 执行、plan_pending |
| `electron/main/agent/agent-session-store.ts` | pendingPlanById |
| `electron/main/agent/agent-loop.ts` | pending 循环、build/dismiss/compose |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 工具 schema |
| `electron/main/agent/agent-tool-aliases.ts` | create_plan 别名 |
| `electron/main/agent-ipc.ts` | IPC |
| `electron/preload/index.ts` | 渲染进程 API |
| `src/types/axecoder.d.ts` | 类型 |
| `src/components/workbench/ChatPlanCard.vue` | 计划卡片 UI |
| `src/components/workbench/ChatPane.vue` | 聊天 Build/Dismiss、编辑器桥接 |
| `src/components/workbench/EditorPane.vue` | 编辑器 Build 按钮 |
| `src/App.vue` | 事件桥接 |
| `tests/unittest/UT-create-plan-build-ui/` | 单测 |

## 单测覆盖

- slug/路径/frontmatter 解析与写盘
- create_plan 别名
- CreatePlan planMode 门控与 plan_pending
- composePlanBuildUserMessage
- dismissAgentPlan 多 pending 场景

## 注意事项

- Build 续跑依赖当前会话 `agentSessionId`；编辑器 Build 无 pending 时新建用户消息发 Agent。
- `buildAgentPlan` 全链路需有效 model/API，单测仅覆盖 dismiss 多 pending 分支。
- 未实现 Cursor 侧 plan todos 与 TodoWrite 同步（后续可增强）。
