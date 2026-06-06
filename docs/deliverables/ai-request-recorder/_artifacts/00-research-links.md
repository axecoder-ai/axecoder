# 调研链接

- `docs/deliverables/ai-performance-monitor/` — 性能仪表盘（底部 Tab、`#metrics` 脱离窗、`ai-metrics-store` 模式）
- `electron/main/ai/chat-with-provider.ts` — 普通聊天模型调用入口
- `electron/main/ai/chat-with-tools.ts` — Agent/工具调用模型入口
- `electron/main/agent/agent-loop.ts` — Agent 多轮 model → tool 循环
- `electron/main/ai-ipc.ts` — `ai:chat` IPC
- `src/components/workbench/BottomPanel.vue` — 底部 Tab 容器
- `src/components/workbench/AiMetricsPanel.vue` — 可参考的监控 UI

**调研缺口：** 尚无请求内容录制模块；需定义 API Key 脱敏与图片 base64 截断策略。
