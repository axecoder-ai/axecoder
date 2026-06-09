# 调研来源

- `Reasonix/internal/agent/agent.go` — `applyStormBreaker`、`repeatedSuccessBlock`（loop guard 参考实现）
- `Reasonix/internal/agent/repeat_guard_test.go` — 行为用例（写 bash 第 3 次拦截、只读 bash 不拦）
- `electron/main/agent/agent-loop.ts` — 工具执行主循环（`runOneTool` → `toolOutcomes` → `messages.push`）
- `electron/main/agent/agent-session-store.ts` — `StoredAgentSession` 会话状态
- `electron/main/agent/agent-system-prompt.ts` — 仅有 prompt 级「勿盲目重试」，无运行时拦截
- `electron/main/agent/agent-bash-readonly.ts` — 只读 bash 判定（repeat guard 需区分写/读）
