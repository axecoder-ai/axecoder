# 功能实现报告

## 功能说明

- TitleBar 新增「AI 性能监控」按钮，一键打开底部 **性能** Tab。
- 主进程 `ai-metrics-store` 在 `chatWithProvider`（聊天）与 `chatWithToolsForModel`（Agent）埋点，采集 TTFT、TPS、QPS、错误率、Token 估算。
- `AiMetricsPanel`：KPI 卡、按模型筛选下拉、模型汇总表、Canvas 折线图（TTFT / TPS·QPS）。
- 底部 Tab 内 **脱离主窗** 打开 `#metrics` 独立 BrowserWindow；独立窗 **收回主窗** 关闭并恢复底部 Tab。
- 每 1.5s 经 `aiMetrics:update` 广播刷新。

## 修改文件列表

| 路径 | 说明 |
|------|------|
| `electron/main/ai-metrics-store.ts` | 指标环形缓冲与聚合 |
| `electron/main/ai-metrics-ipc.ts` | IPC 与定时广播 |
| `electron/main/ai/chat-with-provider.ts` | 聊天埋点 |
| `electron/main/ai/chat-with-tools.ts` | Agent 埋点 |
| `electron/main/ai-ipc.ts` | 传 `chat` source |
| `electron/main/index.ts` | `metricsWin` 生命周期 |
| `electron/preload/index.ts` | 暴露 metrics API |
| `src/types/axecoder.d.ts` | 类型 |
| `src/components/workbench/AiMetricsPanel.vue` | 监控 UI |
| `src/components/workbench/BottomPanel.vue` | 性能 Tab |
| `src/App.vue` | 布局与脱离状态 |
| `src/components/workbench/TitleBar.vue` | 入口按钮 |
| `src/utils/workbench-window-role.ts` | `#metrics` 角色 |
| `shared/i18n/locales/en.ts`, `zh-CN.ts` | 文案 |
| `tests/unittest/UT-ai-performance-monitor/*` | store 单测 |
| `tests/unittest/UT-workbench-split-dual-pane/*` | metrics hash 单测 |

## 单测覆盖

- `ai-metrics-store`：TTFT 记录、按 modelId 筛选快照。
- `parseWorkbenchRoleFromHash('#metrics')`。

## 注意事项

- 非流式 provider 的 TTFT 近似为整段响应时间。
- 指标仅存内存，重启清空。
- 底部 Tab 高度 300px；脱离后独立窗全屏展示图表。
