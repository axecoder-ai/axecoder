# 功能实现报告 — software-co-metagpt-parity

## 功能说明

Software Co. 完整 MetaGPT 对齐（提案 2）：

1. **逐 task 实现** — `sop-task-runner.ts` 拓扑排序 + 每 task Developer 迭代 + mini 可执行反馈
2. **真 shell 跑测** — `sop-test-runner.ts` 自动探测 test 命令；QA 与 implement 内默认 Bash
3. **Message Pool** — `contextForWatch` 带 artifact 路径；截断上限 24k/96k
4. **Action 依赖图** — `sop-action-graph.ts` 驱动 `nextRunnablePhase`
5. **意图分流** — `sop-intent.ts` 增量需求从 `tasks` 起跳
6. **角色工具剖面** — `sop-role-tools.ts` + `runWorkshopRoleAgentTurn` 过滤
7. **Project Manager** — `tasks` 阶段由 `project_manager` 负责；Design 扩展 `sequenceDiagram`
8. **Session 复用** — implement 阶段 `reuseImplementSession` 保留调试上下文
9. **UI** — `WorkshopSopProgress` 显示 task 进度

## 修改文件列表

| 路径 | 说明 |
|------|------|
| `electron/main/sop/sop-task-runner.ts` | 新建 |
| `electron/main/sop/sop-test-runner.ts` | 新建 |
| `electron/main/sop/sop-action-graph.ts` | 新建 |
| `electron/main/sop/sop-intent.ts` | 新建 |
| `electron/main/sop/sop-role-tools.ts` | 新建 |
| `electron/main/sop/sop-pipeline-engine.ts` | 逐 task implement、shell QA、意图入口 |
| `electron/main/sop/message-pool.ts` | contextForWatch、放宽截断 |
| `electron/main/sop/sop-types.ts` | tasks → project_manager |
| `electron/main/sop/sop-prompts.ts` | PM / sequence 提示 |
| `electron/main/sop/sop-gates.ts` | design sequence 闸门 |
| `electron/main/sop/schemas/design.ts` | sequenceDiagram |
| `electron/main/builtin-workflow-roles.ts` | Project Manager 角色 |
| `electron/main/users-types.ts` | project_manager |
| `electron/main/agent/agent-loop.ts` | session 复用、角色工具过滤 |
| `electron/main/workshop/workshop-agent-speaker.ts` | implement sessionId |
| `electron/main/workshop/workshop-types.ts` | sopIntent、task 进度字段 |
| `src/components/workbench/WorkshopSopProgress.vue` | task badge |
| `src/components/workbench/WorkshopChatSection.vue` | 传 task props |
| `src/types/axecoder.d.ts` | 类型 |
| `tests/unittest/UT-sop-*` | 3 套新单测 + pipeline 扩展 |

## 单测覆盖

- 拓扑排序、tasks 解析、test 探测、action 图、intent、pipeline 端到端（含多 task scripted）

## 注意事项

- 无 tasks artifact 时 implement 回退单次 runRolePhase（代码补写路径）
- MetaGPT Python 互操作未做
