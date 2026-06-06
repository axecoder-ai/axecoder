# AI 性能仪表盘优化 设计文档

## 当前背景

- 已有 `ai-metrics-store` 埋点与 `AiMetricsPanel` 底部 Tab + 脱离窗。
- 面板标签 9–10px、`--wc-text-muted` 过多，图表无图例；`errorRate`、`tokensPerMin`、`source`、`provider` 未充分展示；token 仅为 `outputChars/4` 估算。

## 需求

### 功能需求

1. **视觉：** 局部色板、字号阶梯、卡片对比度、Canvas 图例与轴标注；`expanded` 大字号。
2. **指标展示：** TTFT P50/P95、E2E P95、TPS、QPS、错误率高亮、输入/输出 token（实测优先）。
3. **筛选：** 模型、来源（chat/agent/workshop）、Provider、时间范围（session / 1h）。
4. **图表：** 三张——TTFT、TPS·QPS、错误率·Token/min。
5. **Trace 联动：** 模型表行点击 → 底部 Trace Tab + `modelId` 过滤。
6. **Provider usage：** OpenAI 兼容 SSE/JSON、Anthropic、Ollama；无 usage 时字符估算并标记。

### 非功能需求

- 不破坏现有 IPC 向后兼容（`filterModelId` 字符串仍可用）。
- 单测全绿；改动面聚焦 metrics 相关文件。

## 设计决策

### 1. 查询参数

`getAiMetricsSnapshot(filter?: string | AiMetricsFilter)`：`string` 视为 `modelId`；对象可含 `source`、`provider`、`timeRange`。

### 2. Token

`endAiMetricsCall` 接收 `inputTokens`/`outputTokens`/`tokensEstimated`；KPI `totalTokens = input + output`。

### 3. Trace 联动

组件事件：`AiMetricsPanel` emit `openTrace` → `BottomPanel` 切 tab 并传 `traceFilterModelId` → `AiTracePanel` 过滤 `model_call` 事件。

## 实施计划

### 阶段一：数据层（1–2 天）

- 扩展 `AiChatResult.usage` 与各 provider 解析
- 扩展 `ai-metrics-store` 记录与聚合
- 更新 IPC / 类型 / 单测

### 阶段二：面板 UI（1–2 天）

- `AiMetricsPanel` 样式、筛选器、KPI、表、三图
- i18n tooltip

### 阶段三：联动与验收（0.5–1 天）

- BottomPanel + AiTracePanel
- 手工验收 + 实现/审查报告

## 测试策略

- `UT-ai-performance-monitor`：token 实测/估算、筛选、1h 范围、E2E
- 回归：原有 TTFT/QPS/series 用例

## 文件变更清单

| 文件 | 变更 |
|------|------|
| `electron/main/ai-metrics-store.ts` | 核心聚合 |
| `electron/main/ai/providers/*.ts` | usage |
| `src/components/workbench/AiMetricsPanel.vue` | UI |
| 其余见已确认方案 |
