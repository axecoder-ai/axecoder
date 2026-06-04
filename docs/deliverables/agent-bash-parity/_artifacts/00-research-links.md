# 调研链接

- `docs/research/research-axecoder-vs-claude-code.md` — §2 Bash 缺口（无后台/沙箱/完整规则）
- `docs/research/research-claude-code.md` — §3 Shell / BashTool
- `electron/main/agent/agent-bash.ts` — 当前简化实现（单次 spawn、timeout_ms、git 拦截）
- `electron/main/agent/agent-tool-prompts.ts` — `BASH_DESCRIPTION`（AxeCoder subset）
- `electron/main/agent/tool-executor.ts` — `bash_pending` 与参数解析
- `electron/main/agent/agent-loop.ts` — 批准流、`agentAutoApplyWrites`
- `electron/main/agent/agent-permissions.ts` — Bash 权限 ask/allow
- `electron/main/agent/agent-subagent-tasks.ts` — 后台任务（子代理 TaskOutput，可复用模式）
- `src/components/workbench/ChatBashCard.vue` — Bash 待确认 UI
- `tests/unittest/UT-agent-bash/agent-bash.test.ts` — 现有单测
- 外部参考：Claude Code Bash schema（`command`、`timeout`、`description`、`run_in_background`）；`ASSISTANT_BLOCKING_BUDGET_MS = 15_000` 自动后台化

**调研缺口：** 本地无 `claude-code` 快照源码；`BashTool/prompt.ts` 全文以 Mintlify / how-claude-code-works 文档与既有 `agent-tool-level-prompts` 交付为对照。
