# AI 性能监控面板 — 交付总结

| 任务名 | ai-performance-monitor |
|--------|------------------------|
| 完成日期 | 2026-06-06 |
| 选定方案 | 提案 2 – 底部面板 Tab + 可选脱离 + 按模型筛选 |
| 审查结论 | 通过 |
| 单测 | 431/431 全绿 |

---

## 1. 概述

为 AxeCoder 增加 **AI 性能实时监控**：TitleBar 一键打开底部「性能」Tab，展示 TTFT、TPS、QPS、错误率、Token 消耗；支持 **按模型筛选**；可 **脱离主窗** 为独立 OS 窗口，再 **收回** 到底部 Tab。数据来自真实聊天与 Agent 模型调用。

**选型：** 推荐提案 1（侧栏面板），用户选定提案 2（底部 Tab）并加强按模型分组。

**交付物目录：** `docs/deliverables/ai-performance-monitor/_artifacts/`

---

## 2. 方案

- 主进程 `ai-metrics-store` 内存环形缓冲
- `chatWithProvider` / `chatWithToolsForModel` 埋点
- `BottomPanel` 新增性能 Tab + `AiMetricsPanel`（Canvas 图表）
- `#metrics` 独立 BrowserWindow，仿伴生聊天窗脱离/收回

---

## 3. 方案选型过程

见 `_artifacts/02-selection.md`：用户选提案 2，调整「按模型筛选图表」。

---

## 4. 实施计划

见 `_artifacts/plan-ai-performance-monitor.md`（主进程 store → IPC → 埋点 → UI → 单测）。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。

**使用方式：**

1. TitleBar 点击柱状图图标 → 打开底部「性能」Tab  
2. 下拉选择「全部模型」或单个模型  
3. 点击「脱离主窗」→ 独立监控窗  
4. 独立窗点击「收回主窗」→ 恢复底部 Tab  

---

## 6. 单元测试执行情况

命令：`npm test` — **98 文件 / 431 用例全通过**。详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 单测：store 聚合、modelId 筛选、`#metrics` 角色解析  
- 手工建议：发起聊天/Agent 后观察曲线；脱离/收回；切换模型筛选  

---

## 8. 代码审查

结论：**通过**。见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/ai-metrics-store.ts` | 新增 | 指标存储与聚合 |
| `electron/main/ai-metrics-ipc.ts` | 新增 | IPC 广播 |
| `electron/main/index.ts` | 修改 | metricsWin |
| `electron/main/ai/chat-with-provider.ts` | 修改 | 聊天埋点 |
| `electron/main/ai/chat-with-tools.ts` | 修改 | Agent 埋点 |
| `src/components/workbench/AiMetricsPanel.vue` | 新增 | 监控 UI |
| `src/components/workbench/BottomPanel.vue` | 修改 | 性能 Tab |
| `src/App.vue` | 修改 | 布局与状态 |
| `src/components/workbench/TitleBar.vue` | 修改 | 入口按钮 |

---

## 10. 遗留项与后续建议

- Workshop 专用 LLM 路径可补 `workshop` source 标签  
- 指标持久化、导出 CSV 未做  
- 非流式 API 的 TTFT 为近似值  

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型记录 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-ai-performance-monitor.md` |
| 实施计划 | `_artifacts/plan-ai-performance-monitor.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测记录 | `_artifacts/05-unittest.md` |
| 代码审查 | `_artifacts/06-code-review.md` |
