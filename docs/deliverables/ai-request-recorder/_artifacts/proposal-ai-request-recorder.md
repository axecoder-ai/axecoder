## 已确认解决方案提案

**状态：** 已确认

**上下文：**
- **请求：** AI 请求录制器：开始/停止录制，实时记录模型请求与返回；Agent 含 tool 步骤时间线；可脱离窗；保存 JSONL 或清空。
- **选定基础：** 提案 2 – Agent 链路时间线
- **用户调整：** 图片只记摘要，不存 base64

### 最终方案

- **概述：** `ai-trace-store` 管理录制状态与事件缓冲。`chatWithProvider` / `chatWithToolsForModel` 记 `model_call`；`agent-loop` / `tool-executor` 记 `tool_call` / `tool_result`。底部 **Trace** Tab + `#trace` 独立窗；开始/停止/保存/清空。导出 `userData/ai-traces/*.jsonl`。
- **关键变更：** `ai-trace-store.ts`、`ai-trace-ipc.ts`、provider/agent 埋点、`AiTracePanel.vue`、`traceWin`、BottomPanel/TitleBar/App.vue
- **安全：** messages 脱敏；图片 `{ mimeType, size }` 摘要
- **验证：** 录制聊天+Agent 含工具 → 时间线 → 保存 → 清空
