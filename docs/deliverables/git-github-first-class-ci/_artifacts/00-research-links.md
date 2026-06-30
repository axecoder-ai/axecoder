# 调研链接

- `docs/deliverables/git-host-integration/` — 已完成 git-forge 抽象层、gh 只读放行、`/commit-push-pr`、设置页
- `docs/research/research-agent-tools-matrix.md` — §11 Git/PR：AxeCoder 无 `github_*` 工具；ci-investigator 已注册但无 forge 专段
- `docs/research/research-cursor-agent-tools.md` — §6 ci-investigator、§7 FETCH_PULL_REQUEST
- `electron/main/git-forge/forge-prompt.ts` — 主 Agent 注入 Git Safety + PR 段落；**无 CI 专段**
- `electron/main/agent/agent-bash-readonly.ts` — gh 只读前缀（缺 `gh run view/list` 等 CI 命令）
- `electron/main/agent/agent-system-prompt.ts` — `buildAgentSystemPrompt` 含 forge；**`buildDefaultSubAgentSystemPrompt` 不含 forge**
- `electron/main/agent/agent-subagent-types.ts` — ci-investigator / git-commit 前缀为通用英文，无 gh checks 工作流
- `electron/main/agent/tool-executor.ts` — Bash 已注入 `forgeEnvForBash`
- `electron/main/agent/agent-session-store.ts` — `linkedPrUrl` 字段；未用于 prompt 预取
- `src/slash-commands/builtin.ts` — 有 `/commit-push-pr`，**无 CI 调查斜杠**

**调研缺口：** Cursor `FETCH_PULL_REQUEST` 实现细节未在本仓库；本轮以 Bash+gh 只读对齐 Cursor ci-investigator 行为，不引入独立 REST 工具层。
