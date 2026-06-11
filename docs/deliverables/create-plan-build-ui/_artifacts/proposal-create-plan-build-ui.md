# create_plan + Plan Build UI — 已确认方案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**

- **请求：** 内置 `CreatePlan` 工具 + 聊天/编辑器 Build 按钮，Build 执行等价 `/implement`。
- **调研来源：** `docs/research/research-agent-tools-matrix.md` §3、`docs/deliverables/switch-mode-tool/`
- **选定基础：** 提案 1 – CreatePlan 阻塞审批 + 聊天内 Build
- **用户调整：** 必须保留编辑器打开 plan 文件后的 Build 按钮

### 最终方案 – CreatePlan 阻塞审批 + 双端 Build

- **概述：** 新增 `CreatePlan`（别名 `create_plan`），planMode 下写 `docs/plans/plan-<slug>.md` 并进入 `plan_pending`；Chat 展示计划卡片与 Build/Dismiss；编辑器识别 plan 文件显示 Build；Build 退出 planMode、切 agent、注入 implement playbook 并续跑 Agent。
- **关键变更：** `agent-create-plan.ts`、`tool-executor`、`agent-loop`、`agent-ipc`、`ChatPlanCard.vue`、`EditorPane.vue`、`ChatPane.vue`
- **验证：** `UT-create-plan-build-ui` 单测 + 手工 Plan→Build 流程
