# 代码审查 — agent-subagent-parity

## 结论

**通过**（可合并）。单测 337/337 全绿。

## 功能

| 项 | 结果 |
|----|------|
| Task 工具 + Agent 别名 | ✅ |
| 8 种 CC subagent_type + plan | ✅ |
| resume / interrupt / model / readonly / file_attachments | ✅ |
| 后台 output 文件 + TaskOutput block | ✅ |
| Workshop 路径未改 | ✅（符合 chat-only 约束） |

## 质量

- 专型配置集中在 `agent-subagent-types.ts`，便于后续外置 JSON。
- `runSubAgentTask` 返回 `agentId` 向后兼容（Workshop 仅用 `report`）。
- 子代理 transcript 落盘 `.axecoder/subagents/`，需后续 Retention 策略。

## 安全

- 子代理仍禁止嵌套 Task/Agent、禁止 AskUserQuestion。
- resume 文件按 session 隔离；无跨 session 读取。

## 非阻塞待办

1. Rules 页子代理配置 UI（`.cursor/agents` 列表/编辑）。
2. `file_attachments` 图片二进制注入（当前为路径文本 + 可扩展 images）。
3. `best-of-n-runner` 与 `EnterWorktree` 深度整合。

## 阻塞项

无。
