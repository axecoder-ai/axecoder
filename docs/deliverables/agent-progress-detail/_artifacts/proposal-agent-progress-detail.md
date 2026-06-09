# Agent 进度流展示 Model/Tool 结果详情

**状态：** 已确认

**选定方案：** 提案 1 – 扩展 progress payload 附带 detail 字段

---

## 最终方案

- **概述：** `model`/`tool` 的 `status: 'done'` 携带 `detail`；`AgentProgressStep.detail` 在 `AgentProgressStream` 以 `<pre>` 展示；后端 `formatModelCallDetail` / `formatToolResultDetail` 截断至 4k。
- **关键变更：**
  - `electron/main/agent/agent-progress-detail.ts` — 格式化与截断
  - `electron/main/agent/agent-loop.ts` — emit detail
  - `src/utils/agent-progress.ts` — 类型与 apply
  - `src/components/workbench/AgentProgressStream.vue` — 展示
  - `src/types/axecoder.d.ts` — payload 类型
- **验证：** `tests/unittest/UT-agent-progress/` 全绿
