## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 提升 AI 性能仪表盘对比度与清晰度；补齐指标展示与数据质量（真实 token、E2E、来源/Provider 筛选、第三张图、Trace 联动、时间范围）。
- **调研来源：** `docs/deliverables/ai-metrics-dashboard-polish/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-ai-metrics-dashboard-polish.md`（make-proposals 草稿）
- **选定基础：** 提案 3 – 全量三期路线图
- **用户调整摘要：** 无额外调整，按方案原文落地

---

### 最终方案 – 性能仪表盘三期合一

- **概述：** 在 `AiMetricsPanel` 引入局部高对比色板与分档字号、Canvas 图例；扩展 KPI/表/三张图（TTFT、TPS·QPS、错误率·Token/min）；`ai-metrics-store` 增加 E2E 延迟、真实/估算 token、来源与 Provider 聚合及 `session`/`1h` 时间范围；各 provider 解析 `usage`（无则回退字符估算）；模型表行可跳转 Trace Tab 并按 `modelId` 过滤；i18n 补语义 tooltip。
- **相对选定提案的变更：** 无（用户未缩减范围）。成本估算、持久化导出留待后续。
- **关键变更：**
  - `src/components/workbench/AiMetricsPanel.vue`
  - `src/components/workbench/BottomPanel.vue`、`AiTracePanel.vue`
  - `electron/main/ai-metrics-store.ts`、`ai-metrics-ipc.ts`
  - `electron/main/models-types.ts`
  - `electron/main/ai/providers/openai.ts`、`anthropic.ts`、`ollama.ts`
  - `electron/main/ai/chat-with-provider.ts`、`chat-with-tools.ts`
  - `electron/preload/index.ts`、`src/types/axecoder.d.ts`
  - `shared/i18n/locales/en.ts`、`zh-CN.ts`
  - `tests/unittest/UT-ai-performance-monitor/ai-metrics-store.test.ts`
- **权衡：**
  - ✅ 一次解决可读性与指标缺口
  - ❌ provider usage 字段不一致，Ollama/非流式需回退估算
  - ❌ 数据仍仅内存，重启丢失
- **验证：** 扩展单测；手工多场景（聊天/Agent、筛选、Trace 跳转、脱离窗）
- **待解决问题：** 模型单价成本卡片；落盘与 CSV 导出；Agent 回合级耗时深度聚合

### 未采纳方案说明

- **未选：** 提案 1 / 提案 2
- **原因：** 用户选定全量三期
