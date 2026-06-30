**状态：** 已确认（由 `/create-proposals` 生成）

## 已确认解决方案提案

**上下文：**
- **请求：** 修复 Agent 长会话 compact 后质量下降；Chat `/compact` 同步 LLM 摘要。
- **调研来源：** `docs/deliverables/llm-compact/`；`agent-loop.ts`；`agent-frc.ts`；`chat-compact.ts`
- **上游提案：** `docs/proposals/proposal-long-session-compact-quality.md`（双方案草稿）
- **选定基础：** 提案 1 – 先摘要后 FRC + 滚动摘要沉淀
- **用户调整摘要：** 必须同时升级 Chat `/compact` 为 LLM 摘要

### 最终方案 – 先摘要后 FRC + 滚动摘要 + Chat LLM compact

- **概述：** `prepareSessionBeforeModel` 在超阈值时**先** LLM compact（完整 tool 内容），**再** FRC。`StoredAgentSession` 增加 `rollingCompactSummary`；再次 compact 时合并旧摘要。`chat:compact` IPC 与 `/compact` 斜杠改走 LLM 摘要（传 `modelId`），失败回退规则摘要。
- **相对选定提案的变更：** Chat `/compact` 从「可选」提升为**必做**。
- **关键变更：**
  - `agent-context-compact.ts` — `priorSummary`、`extractPriorCompactSummary`
  - `agent-loop.ts` — FRC/compact 顺序；写入 `rollingCompactSummary`
  - `agent-session-store.ts` — `rollingCompactSummary?`
  - `chat-compact.ts` — `compactChatHistoryWithLlm`
  - `agent-ipc.ts`、`preload`、`axecoder.d.ts`、`builtin.ts`
  - `tests/unittest/UT-long-session-compact-quality/`
- **权衡：** 滚动摘要合并可能变长，沿用 `SUMMARY_OUTPUT_CAP`；Chat 无 tool 消息，质量提升主要在 Agent。
- **验证：** UT 覆盖 priorSummary、Chat LLM 路径；`npm test` 全绿。
- **待解决问题：** Settings cooldown；调研矩阵 §12 同步。

### 未采纳方案说明

- **未选：** 提案 2 – 统一压缩管线 + 结构化摘要与 toolLog 补强
- **原因：** 用户选最小改动路径；toolLog 补强二期
