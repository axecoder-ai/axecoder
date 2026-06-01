# Agent SSE 进度流 UI

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 聊天侧栏 Agent 执行中 SSE 进度 UI 对齐 Claude Code CLI 终端风（工具行、shimmer、推理块），IDE 深色主题。
- **调研来源：** `docs/deliverables/agent-sse-progress-ui/_artifacts/00-research-links.md`
- **上游提案：** 同路径双方案草稿
- **选定基础：** 提案 1 – 终端风独立组件 + 结构化进度步
- **用户调整摘要：** 无额外调整

---

### 最终方案 – 终端风 AgentProgressStream

- **概述：** 新增 `AgentProgressStream.vue` 渲染 SSE 进度；`AgentProgressStep` 增加 `toolName?`、`summary?`；工具行用等宽字体与 ✓/✗/spinner；活动行 CSS shimmer；`streamText` 作为弱化推理块；已完成工具默认折叠（保留最近 5 条，可展开）；headline 显示当前活动工具或 Thinking 类动词。
- **相对选定提案的变更：** 无（按原提案 1 落地）
- **关键变更：**
  - `src/utils/agent-progress.ts` — 扩展类型、CC 风格 label 辅助、`formatToolLine`/`visibleProgressSteps`
  - `src/components/workbench/AgentProgressStream.vue` — 新组件
  - `src/components/workbench/ChatPane.vue` — 引用新组件
  - `tests/unittest/UT-agent-progress/agent-progress.test.ts`
- **权衡：** 中等改动；`delta` 仍混合 content+reasoning，统一进推理块。
- **验证：** Vitest；Agent 模式手工跑多工具轮次。
- **待解决问题：** 后续若需拆分 reasoning/content 流，需扩展 payload。

### 未采纳方案说明

- **未选：** 提案 2 仅样式层
- **原因：** 对齐度与可维护性不足
