# 协作思考折叠 设计文档

> 依据：`docs/proposals/proposal-collab-think-fold.md`（已确认）

## 当前背景

- Workshop 已有 `thinking`/`speaking`/`done` 进度与 `AgentProgressStream`。
- `speaking` 在 speaker 之前触发，导致 UI 与「先思考后正文」不一致。
- 流式 `streamText` 与正文气泡重复展示。

## 需求

### 功能需求（P0）

- F1：`thinking` 期间仅展示 `AgentProgressStream`（含推理/工具流）。
- F2：角色完成后插入 `kind:'reasoning'` 消息（有内容时），UI **默认折叠**。
- F3：随后展示员工 `summary` 正文气泡。
- F4：`priorSummary`、API pad 忽略 reasoning 条。

### 非功能需求

- 单测不依赖真实 API；scripted speaker 可返回模拟 reasoning。

## 设计决策

### 1. 思考条形态

- `WorkshopMessage.kind = 'reasoning'`，`roleId` 与当轮员工相同，便于头像对齐。

### 2. 进度时序

- `thinking` → `await speaker()` → `speaking`（可选）→ 落盘 → `done`。

## 技术设计

### 文件变更

| 文件 | 操作 |
|------|------|
| `workshop-types.ts` | `kind`、`RoleSpeakOutput.reasoningContent` |
| `workshop-orchestrator.ts` | 落盘顺序、priorSummary、pad 跳过 |
| `agent-loop.ts` | 返回 `reasoningContent` |
| `workshop-agent-speaker.ts` | 透传 |
| `WorkshopMessageItem.vue` | 折叠 UI |
| `WorkshopPane.vue` | 进度展示调整 |
| `axecoder.d.ts` | 类型 |
| `UT-collab-workshop/workshop-orchestrator.test.ts` | 单测 |

## 实施计划

1. 类型 + orchestrator + agent-loop 提取 reasoning  
2. UI 折叠与 Pane 去重  
3. 单测与报告

## 测试策略

- orchestrator：reasoning 条在 summary 前；priorSummary 不含 reasoning
