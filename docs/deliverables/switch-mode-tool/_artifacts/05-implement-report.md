# SwitchMode 工具 — 功能实现报告

## 功能说明

新增 Agent 工具 **SwitchMode**，参数 `target_mode_id`（必填）、`explanation`（可选）。

- Cursor 兼容：`agent`、`plan`（→ planning）
- 扩展：`planning`、`planning-only`、`auto-plan`、`reflection`
- 同步 `session.chatMode`、`planMode`、`activeTools`
- 经 `agent:progress` `chat_mode` 事件更新 ChatPane 下拉与 localStorage
- 保留 EnterPlanMode / ExitPlanMode

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/agent/chat-mode.ts` | resolveSwitchModeTarget、applySwitchModeToSession |
| `electron/main/agent/agent-session-store.ts` | chatMode 字段 |
| `electron/main/agent/agent-loop.ts` | 初始化 chatMode |
| `electron/main/agent/agent-types.ts` | SwitchMode 工具名 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 工具 schema |
| `electron/main/agent/agent-ext-executor.ts` | 执行 + emit |
| `electron/main/agent/agent-subagent-types.ts` | plan 子代理屏蔽 SwitchMode |
| `electron/main/agent/rppit-axecoder-addon.ts` | 运行时说明 |
| `src/utils/agent-progress.ts` | chat_mode 事件类型 |
| `src/types/axecoder.d.ts` | 类型同步 |
| `src/components/workbench/ChatPane.vue` | UI 同步 |
| `tests/unittest/UT-switch-mode-tool/` | 新单测 |

## 注意事项

- 不支持经 SwitchMode 切入 rppit / multi-agent
- 会话 system prompt 中的 chat-mode addon 不在切换时重写（planMode/tools 即时生效）
