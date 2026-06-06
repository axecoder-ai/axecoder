# AI 请求录制器 设计文档

## 需求

- 开始/停止录制；录制中实时追加事件
- 事件：model_call（messages+response）、tool_call、tool_result、error
- Agent 按 sessionId 分组展示
- 脱离 `#trace` 窗；保存 JSONL；清空
- 图片仅摘要

## 实施计划

1. `ai-trace-store.ts` + 消息脱敏 + 单测
2. `ai-trace-ipc.ts` + preload
3. 埋点 provider + agent-loop + tool-executor
4. `traceWin` + `AiTracePanel.vue` + BottomPanel Tab
5. App/TitleBar/i18n/角色解析
6. Vitest + 全量测试
