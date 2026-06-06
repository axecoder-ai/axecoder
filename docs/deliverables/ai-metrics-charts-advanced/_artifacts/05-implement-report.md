# 功能实现报告 — 进阶图表

## 新增图表（共 9 张）

| 图表 | 类型 |
|------|------|
| TTFT P50/P95 | 折线 + **SLO 3s 参考线** + 超标红点 |
| E2E P95 | 折线 |
| TPS/QPS | 折线（原有） |
| 输入/输出 Token | 双折线（k） |
| 错误率/Token min | 折线（原有） |
| 累计 Token | 折线（k） |
| 来源占比 | 环形图 |
| 成功/失败 | 堆叠柱 |
| 输入 Token 分布 | 直方图 0-1k/1k-4k/4k-16k/16k+ |

## 数据层

- `AiMetricsSeriesPoint` 扩展 7 字段
- 快照增 `sourceBreakdown`、`inputTokenHistogram`、`sloThresholdMs`

## 修改文件

- `electron/main/ai-metrics-store.ts`
- `src/components/workbench/AiMetricsPanel.vue`
- `src/types/axecoder.d.ts`
- `shared/i18n/locales/*.ts`
- `tests/unittest/UT-ai-performance-monitor/ai-metrics-store.test.ts`

## 遗留

- 成本曲线（需模型单价配置）
