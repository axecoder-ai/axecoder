# 功能实现报告 — AI 性能仪表盘优化

## 功能说明

1. **视觉对比度**：`AiMetricsPanel` 局部色板（`#1a1d27` 卡片、`#f1f5f9` 数值），字号 11–16px（脱离窗 20px），图表图例与轴标注提亮。
2. **指标扩展**：KPI 增加 E2E P95、输入/输出 Token；错误率 >0 红色高亮；累计 Token 标注「估算」。
3. **筛选**：模型、来源（chat/agent/workshop）、Provider、时间范围（本次启动 / 近 1h）。
4. **图表**：第三张图——错误率 + Token/min（k）。
5. **真实 Token**：OpenAI SSE/JSON、Anthropic、Ollama 解析 `usage`；无则 `chars/4` 估算。
6. **Trace 联动**：模型表「Trace」按钮 → 底部 Trace Tab 并按 `modelId` 过滤。

## 修改文件列表

| 文件 | 说明 |
|------|------|
| `electron/main/ai-metrics-store.ts` | E2E、token 实测/估算、筛选、providers/sources 元数据 |
| `electron/main/ai/parse-token-usage.ts` | usage 解析与估算 |
| `electron/main/ai/providers/*.ts` | 各 provider 回传 usage |
| `electron/main/ai/chat-with-provider.ts` | 埋点传 token |
| `electron/main/ai/chat-with-tools.ts` | Agent 埋点传 token |
| `electron/main/models-types.ts` | `AiTokenUsage` |
| `electron/main/ai-metrics-ipc.ts` | 支持 `AiMetricsFilter` |
| `electron/preload/index.ts` | IPC 类型 |
| `src/types/axecoder.d.ts` | 前端类型 |
| `src/components/workbench/AiMetricsPanel.vue` | UI 全面迭代 |
| `src/components/workbench/BottomPanel.vue` | Trace 跳转 |
| `src/components/workbench/AiTracePanel.vue` | `filterModelId` |
| `shared/i18n/locales/*.ts` | 文案与 tooltip |
| `tests/unittest/UT-ai-performance-monitor/ai-metrics-store.test.ts` | 7 用例 |

## 单测覆盖

- TTFT/E2E/token 聚合
- modelId / source / provider / 1h 筛选
- providers/sources 元列表
- 原 QPS、series 回归

## 注意事项

- 数据仍仅内存，重启丢失（待后续持久化）。
- 成本估算未纳入本轮。
- 脱离窗内点击 Trace 仅在主窗 BottomPanel 联动（脱离窗无 Trace）。
