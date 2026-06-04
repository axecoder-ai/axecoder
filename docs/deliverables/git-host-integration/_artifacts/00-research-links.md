# 调研链接

- `docs/research/research-axecoder-vs-claude-code.md` — §2 工具缺口、§4 斜杠命令（无 GitHub 集成）
- `docs/research/research-claude-code.md` — §4.6 `/install-github-app`、GitHub PR/Issue 集成
- `claude-code/src/tools/BashTool/prompt.ts` — `gh pr create` 工作流、Git Safety Protocol
- `claude-code/src/commands/commit-push-pr.ts` — `/commit-push-pr` 斜杠命令与 allowedTools
- `claude-code/src/utils/shell/readOnlyCommandValidation.ts` — `gh pr view/list/diff` 等只读自动放行
- `claude-code/src/tools/shared/gitOperationTracking.ts` — commit/push/PR 检测与 PR URL 解析
- `claude-code/src/utils/github/ghAuthStatus.ts` — gh CLI 安装与认证状态
- `claude-code/src/commands/install-github-app/` — GitHub Actions App 安装向导（Anthropic 专属）
- `electron/main/agent/agent-bash.ts` — 当前 Bash（危险 git 拦截，无 gh 只读/forge 感知）
- `electron/main/agent/agent-tool-prompts.ts` — `BASH_DESCRIPTION`（无 GitHub/Gitee PR 段落）
- `electron/main/agent/agent-system-prompt.ts` — `computeSimpleEnvInfo`（无 remote/gh 状态）
- `electron/main/git-ipc.ts` — 仅 `git:status`，无 forge 集成
- `src/slash-commands/builtin.ts` — 无 `/commit-push-pr`、`/install-github-app`
- `docs/deliverables/agent-bash-parity/` — Bash 契约已对齐，GitHub 工作流仍缺

**调研缺口：** `/install-github-app` 强依赖 Anthropic GitHub App 与 OAuth；AxeCoder 需做桌面化适配或提供等价「forge 连接向导」，不能直接复制 OAuth 流程。
