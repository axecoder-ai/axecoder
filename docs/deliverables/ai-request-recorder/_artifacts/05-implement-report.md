# 功能实现报告

## 功能说明

- TitleBar 红点按钮打开底部 **录制** Tab
- **开始/结束录制**：录制中每次模型调用、Agent 工具调用/结果实时追加
- 事件类型：`model_call`、`tool_call`、`tool_result`；含 sessionId/turn 分组
- 点击条目展开请求/返回 JSON（图片仅摘要，API Key 脱敏）
- **保存** → `userData/ai-traces/trace-*.jsonl`；**清空**缓冲
- **脱离主窗** → `#trace` 独立窗；**收回**恢复底部 Tab

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/ai-trace-store.ts` | 录制状态与事件 |
| `electron/main/ai-trace-ipc.ts` | IPC + 保存 |
| `electron/main/ai/chat-with-provider.ts` | 聊天 model_call |
| `electron/main/ai/chat-with-tools.ts` | Agent model_call |
| `electron/main/agent/agent-loop.ts` | tool_call/result |
| `electron/main/index.ts` | traceWin |
| `src/components/workbench/AiTracePanel.vue` | UI |
| `BottomPanel.vue` / `TitleBar.vue` / `App.vue` | 入口与脱离 |
| preload / types / i18n | API 与文案 |

## 单测

- `ai-trace-store` 脱敏与录制开关
- `#trace` 角色解析
