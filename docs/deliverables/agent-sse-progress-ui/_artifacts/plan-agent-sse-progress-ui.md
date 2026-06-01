# Agent SSE 进度流 UI 设计文档

> **状态：** 计划（提案 1 已确认）  
> **范围：** `agent-progress.ts`、`AgentProgressStream.vue`、`ChatPane.vue`、单测  
> **不实施：** 本文档阶段不改代码

## 当前背景

- `ChatPane.vue` 用 `ul.progress-steps` + 圆点 + 中文长 label 展示 SSE 进度；`streamText` 在 `pre` 中展示。
- `applyProgressPayload` 已聚合 model/tool 步，payload 含 `toolName`/`summary` 但未写入 step。

## 需求（P0）

1. 工具行：等宽、`工具名` + `参数`、状态 glyph（spinner/✓/✗）。
2. 活动行 shimmer；headline 为 `Thinking…` 或当前工具名。
3. `streamText` → 弱化推理块（左侧竖线、dim 色）。
4. 已完成步默认折叠，保留最近 5 条 +「展开 N 项」。
5. 子代理任务行与工具行视觉一致。

## 文件变更

| 文件 | 操作 |
|------|------|
| `src/utils/agent-progress.ts` | 扩展 step、折叠/headline 辅助 |
| `src/components/workbench/AgentProgressStream.vue` | 新增 |
| `src/components/workbench/ChatPane.vue` | 替换 progress 模板与样式 |
| `tests/unittest/UT-agent-progress/agent-progress.test.ts` | 补充 |

## 实施计划

1. 扩展 `AgentProgressStep` 与 `applyProgressPayload` 写入 `toolName`/`summary`。
2. 添加 `sliceProgressStepsForDisplay`、`activeProgressHeadline`。
3. 实现 `AgentProgressStream.vue`（模板 + scoped CSS）。
4. `ChatPane` 接入并删除旧 progress CSS。
5. Vitest 全绿。

## 测试策略

- 单测：折叠逻辑、headline、tool 字段写入。
- 手工：Agent 多轮 Read/Glob，确认折叠与推理块。
