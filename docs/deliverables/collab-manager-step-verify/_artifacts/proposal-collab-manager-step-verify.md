## 已确认解决方案提案

**状态：** 已确认

**上下文：**
- **请求：** 协作 Workshop：技术经理先按 `~/.aex-coder/users.json` 拆步骤并指定执行人；逐步单 Agent 执行；每步后经理验收（通过 / 重做 / 终止）。
- **选定：** 提案 1 – 动态步骤计划 + 经理验收状态机
- **调整：** V1 在 Workshop UI 展示步骤进度条与当前步骤

### 最终方案

- **概述：** `startRun` 先 `planning` 由经理输出 JSON 步骤表（`assigneeUserId` 须在 users 白名单）；再 `step_running` 逐步执行；每步后 `step_verify` 经理输出 `VERIFY: approve|redo|abort`；`redo` 重跑当前步。消息带 `speakerUserId`；UI 顶栏步骤条展示计划与状态。
- **关键变更：** `workshop-plan-parse.ts`、`workshop-orchestrator.ts`、`workshop-types.ts`、`workshop-user-bind.ts`、`WorkshopPane.vue`、单测。
- **验证：** 单测覆盖解析、approve/redo；手工多角色 users.json 全流程。

### 未采纳

- 提案 2：四套固定角色 + 自然语言验收，无法覆盖系统架构师等角色。
