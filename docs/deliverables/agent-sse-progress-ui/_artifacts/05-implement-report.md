# 功能实现报告 — Agent SSE 进度流 UI

## 功能说明

- 新增 `AgentProgressStream.vue`：终端风工具行（等宽、glyph、工具名+参数）、活动 headline shimmer、推理块（左侧竖线 dim）、已完成步骤折叠（保留 5 条 + 展开）。
- `agent-progress.ts`：`AgentProgressStep` 增加 `toolName`/`summary`；`activeProgressHeadline`、`sliceProgressStepsForDisplay`。
- `ChatPane.vue` 接入新组件，移除旧圆点列表样式。

## 修改文件

| 路径 | 说明 |
|------|------|
| `src/utils/agent-progress.ts` | 结构化 step + 展示辅助 |
| `src/components/workbench/AgentProgressStream.vue` | 新 UI 组件 |
| `src/components/workbench/ChatPane.vue` | 引用组件、删旧 CSS |
| `tests/unittest/UT-agent-progress/agent-progress.test.ts` | 折叠/headline/字段单测 |

## 注意事项

- `delta` 仍混合 content+reasoning，统一显示在推理块。
- 非 Agent 模式仍用 `fallbackHeadline`（轮换 idle hints）。
