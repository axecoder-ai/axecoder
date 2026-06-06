# 调研链接

| 文档 | 说明 |
|------|------|
| `docs/deliverables/ai-performance-monitor/_artifacts/proposal-ai-performance-monitor.md` | 已交付的性能监控基础方案（埋点、Tab、脱离窗） |
| `docs/deliverables/ai-performance-monitor/_artifacts/05-implement-report.md` | 初版实现说明 |
| `docs/examples/ai-performance-dashboard.html` | 示例仪表盘（字号、卡片对比度、Chart.js 图例参考） |
| `electron/main/ai-metrics-store.ts` | 指标存储与聚合（source/provider/error/series 已有） |
| `src/components/workbench/AiMetricsPanel.vue` | 当前面板 UI（9–10px 标签、无图例、muted 色过多） |
| `electron/main/ai-trace-store.ts` | Trace 面板事件（可联动） |

**调研缺口：** 无 provider `usage` 真实 token 的统一接入层文档；非流式 TTFT 近似策略仅在初版 proposal 脚注提及。
