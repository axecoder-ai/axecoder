# Agent auto_plan 模式

**状态：** 已确认

## 背景

对齐 Reasonix `auto_plan`：复杂多步任务在 Agent 模式下自动进入只读 plan mode，避免未经规划直接改码。

## 方案（已选：启发式移植）

- 移植 `autoPlanScore` / `shouldAutoPlan` 启发式（Reasonix `internal/control/auto_plan.go`）
- 配置项 `agentAutoPlan: off | on`（默认 off）
- `startAgentTurn` 在 `chatMode === 'agent'` 时评估最后一条 user 消息，score≥2 则 `planMode=true`
- `bypassPermissions` 与显式 `planning` 模式不覆盖
- 设置页开关 + `/auto-plan off|on` 斜杠命令

## 非目标（后续）

- `auto_plan_classifier` 独立模型分类（borderline score≤2 时 LLM 判定）
- 双模型 planner 会话
