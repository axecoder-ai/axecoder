# Collab 经理拆步 + 逐步验收

> `docs/proposals/proposal-collab-manager-step-verify.md`（已确认）

## 需求（P0）

1. `planning`：经理输出 JSON `{ steps: [{ id, title, assigneeUserId }] }`，userId 校验 users.json。
2. `step_running`：每步仅一名 assignee 跑 agent。
3. `step_verify`：经理 `VERIFY: approve|redo|abort`；redo 重跑当前步。
4. UI：步骤进度条 + 当前步高亮。

## 实施

1. `workshop-plan-parse.ts` + 单测  
2. `workshop-types` / orchestrator / user-bind / agent-speaker  
3. `WorkshopPane` 步骤条  
4. 更新 `UT-collab-workshop` 编排单测  

## 测试

- `workshop-plan-parse.test.ts`
- `workshop-orchestrator.test.ts`（scripted 三步 + redo）
