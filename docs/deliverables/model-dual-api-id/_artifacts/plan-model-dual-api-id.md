# 单模型双 API ID + 自动档位 — 实施计划

**desired_location:** `docs/plans/plan-model-dual-api-id.md`

## 当前背景

- `ModelEntry` 仅一个 `modelId`；全局 `fastModelId` 指向另一条目（`model-tier-routing`）。
- 用户希望同一 Base URL/Key 下配置两个 API 模型名，并按问题复杂度自动选择。

## 需求

### 功能需求

- 表单：快速模型 ID、深度模型 ID（深度必填，快速可空=同深度）。
- 主会话/Agent：末条 user 文本 → 启发式 → fast 或 deep API。
- 子 Agent explore/plan、工坊 tester：`tier: fast`。
- 废弃全局快速模型下拉与 `setFastModel`。
- 关闭 `agentModelTierRoutingEnabled` 时始终深度 API。

### 非功能需求

- 旧 `models.json` 可读；可选迁移 `fastModelId` → `fastApiModelId`。
- 单测覆盖启发式与 API 解析。

## 设计决策

### 1. 字段命名

- `modelId` = 深度 API（兼容）
- `fastApiModelId` = 快速 API（可选）

### 2. 路由

- 条目选择：始终 `activeModelId`（`model-resolve` 简化）
- API 名：`resolveApiModelId(entry, tier, userText)`

### 3. 启发式（V1）

- deep：长度>400、代码块、≥2 文件路径、关键词（重构/架构/implement/review/调试/全量等）
- 否则 fast

## 实施计划

| 阶段 | 任务 |
|------|------|
| 1 | 类型与 store；迁移读入 |
| 2 | `prompt-tier-heuristic.ts`、`api-model-resolve.ts` |
| 3 | chat/agent/ai-ipc 传 `apiModelId` |
| 4 | 更新 `model-resolve`；子代理/工坊传 fast tier |
| 5 | UI：ModelFormDialog、ModelsTab 去全局 fast |
| 6 | preload/types；单测；更新 tier-routing 测试 |

## 文件变更

- 新增：`electron/main/ai/prompt-tier-heuristic.ts`、`api-model-resolve.ts`
- 修改：models-*、chat-*、agent-loop、ai-ipc、model-resolve、ModelFormDialog、ModelsTab、preload、axecoder.d.ts
- 测试：`tests/unittest/UT-model-dual-api-id/`
