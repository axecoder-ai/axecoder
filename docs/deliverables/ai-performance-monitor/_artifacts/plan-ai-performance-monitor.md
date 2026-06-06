# AI 性能监控面板 设计文档

## 当前背景

- 无 AI 调用性能采集；`docs/examples/ai-performance-dashboard.html` 为静态模拟
- `BottomPanel` 现有 Terminal/Output/Problems 三 Tab
- `companionWin` 已实现 `#companion` 双窗模式

## 需求

### 功能需求

- TitleBar 按钮打开底部「性能」Tab
- KPI：TTFT P95、TPS、QPS、错误率、Token/min、并发
- Canvas 折线图：延迟分位、TPS、QPS、错误率、Token 速率
- **按模型筛选**（全部 / 单个 modelId）
- Tab 内「脱离」→ `#metrics` 独立窗；「收回」→ 关闭独立窗恢复 Tab

### 非功能需求

- 主进程内存环形缓冲，重启清空
- 1.5s 广播刷新，多窗数据一致

## 设计决策

1. 埋点在 `chatWithProvider` / `chatWithToolsForModel`，source 区分 chat/agent/workshop
2. `metricsWin` 仿 `companionWin`，角色 `metrics`
3. 图表用轻量 Canvas，不引入 Chart.js

## 实施计划

1. `ai-metrics-store.ts` + 单测
2. `ai-metrics-ipc.ts` + preload 类型
3. 埋点 chat-with-provider / chat-with-tools
4. `index.ts` metricsWin IPC
5. `AiMetricsPanel.vue` + `BottomPanel` Tab
6. `App.vue` / `TitleBar` / i18n / 角色解析
7. Vitest + 手工验收

## 文件变更

| 文件 | 操作 |
|------|------|
| `electron/main/ai-metrics-store.ts` | 新增 |
| `electron/main/ai-metrics-ipc.ts` | 新增 |
| `electron/main/ai/chat-with-provider.ts` | 修改 |
| `electron/main/ai/chat-with-tools.ts` | 修改 |
| `electron/main/index.ts` | 修改 |
| `electron/preload/index.ts` | 修改 |
| `src/types/axecoder.d.ts` | 修改 |
| `src/components/workbench/AiMetricsPanel.vue` | 新增 |
| `src/components/workbench/BottomPanel.vue` | 修改 |
| `src/App.vue` | 修改 |
| `src/components/workbench/TitleBar.vue` | 修改 |
| `src/utils/workbench-window-role.ts` | 修改 |
| `shared/i18n/locales/*.ts` | 修改 |
| `tests/unittest/UT-ai-performance-monitor/*.test.ts` | 新增 |
