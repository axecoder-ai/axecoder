## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** AI 性能实时监控面板，结合多模型；TitleBar 一键打开；可脱离/收回独立窗。
- **调研来源：** `docs/deliverables/ai-performance-monitor/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-ai-performance-monitor.md`（make-proposals 草稿）
- **选定基础：** 提案 2 – 底部面板 Tab 集成 + 可选脱离
- **用户调整摘要：** 图表支持按模型分组与筛选（下拉选择「全部」或单个模型）。

---

### 最终方案 – 底部性能 Tab + 指标独立窗

- **概述：** 主进程 `ai-metrics-store` 在 `chatWithProvider` / `chatWithToolsForModel` 埋点，记录 TTFT、TPS、错误率、token 估算，并按 `modelId` 分桶。`BottomPanel` 新增「性能」Tab，展示 KPI 卡与 Canvas 折线图；顶部提供模型筛选器。Tab 内「脱离」按钮打开 `#metrics` 独立窗；独立窗内「收回」关闭并恢复底部 Tab。TitleBar 增加监控按钮一键打开底部性能 Tab。指标经 IPC 快照 + 定时广播刷新。
- **相对选定提案的变更：** 增加按模型筛选 UI；各模型 KPI 小计与全局序列可切换。
- **关键变更：**
  - `electron/main/ai-metrics-store.ts`、`ai-metrics-ipc.ts`
  - `electron/main/ai/chat-with-provider.ts`、`ai/chat-with-tools.ts` — 埋点
  - `electron/main/index.ts` — `metricsWin`
  - `src/components/workbench/AiMetricsPanel.vue`、`BottomPanel.vue`
  - `src/App.vue`、`TitleBar.vue`、`workbench-window-role.ts`
  - `electron/preload/index.ts`、`src/types/axecoder.d.ts`、`shared/i18n/locales/*.ts`
- **权衡：**
  - ✅ 不占编辑区；底部 Tab 符合 IDE 习惯
  - ✅ 按模型筛选满足用户调整
  - ❌ 底部高度有限，脱离独立窗查看大图
- **验证：** `ai-metrics-store` 单测；手工聊天/Agent 后观察曲线、模型筛选、脱离/收回
- **待解决问题：** 非流式 provider TTFT 近似整段延迟；数据仅内存

### 未采纳方案说明

- **未选：** 提案 1 – 主窗内嵌侧栏面板
- **原因：** 用户偏好底部 Tab，不占用侧栏空间
