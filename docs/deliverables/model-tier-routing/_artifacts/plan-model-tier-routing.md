# plan-model-tier-routing

## 当前背景

- `models.json` 仅有 `activeModelId`；主 Agent、子 Agent、工坊共用。
- 工坊经 `buildAgentRoleSpeaker` + `runWorkshopRoleAgentTurn`，子 Agent 经 `runSubAgentTask`。

## 需求

### P0

- `models.json` 增加 `fastModelId`（可选）；设置页可配置「快速模型（子任务）」。
- `resolveModelIdForTask('main' | 'subagent')`：未配置 fast、fast 未启用、或关闭 `agentModelTierRoutingEnabled` 时回退 `activeModelId`。
- `Agent` 工具：`explore`/`plan` 子类型 → subagent；`generalPurpose` → main。
- 工坊：`manager` 与 plan/verify → main；`tester` → subagent；backend/frontend execute → main。
- `buildSubagentRoleSpeaker` 内按角色解析（与工坊规则一致）。

## 实施计划

1. `model-resolve.ts` + 单测
2. `models-types` / `models-store` / IPC / preload / 类型
3. `tool-executor`、`workshop-agent-speaker`、`workshop-subagent-speaker`
4. `ModelsTab.vue` 快速模型下拉
5. `config-store` 开关字段（默认 true）

## 测试策略

- `UT-model-tier-routing/model-resolve.test.ts`：回退、fast 启用、开关关闭、删除 fast 模型
