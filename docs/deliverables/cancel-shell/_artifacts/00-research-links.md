# 调研链接

- `docs/research/research-agent-tools-matrix.md` — §2 终端与后台任务：AxeCoder「取消 Shell = 部分 stop」
- `docs/deliverables/agent-bash-parity/_artifacts/proposal-agent-bash-parity.md` — 后台 Bash + TaskOutput 已落地
- `electron/main/agent/agent-bash-tasks.ts` — 后台 shell 任务 Map，无进程 kill 能力
- `electron/main/agent/agent-ext-executor.ts` — `TaskOutput` 已合并 shell；`TaskStop` 仅调 `stopBackgroundRun`
- `electron/main/agent/agent-subagent-tasks.ts` — 子代理 `stopBackgroundRun` / `interruptBackgroundRun` 参考实现
- `electron/main/agent/agent-loop.ts` — `stopAgentTurn` 仅中断子代理，未杀 shell 进程
- `electron/main/agent/agent-tool-prompts-ext.ts` — `TaskStop` 描述为「Stop a running background sub-agent task」
- `tests/unittest/UT-agent-bash-parity/agent-bash-parity.test.ts` — 后台 Bash 单测（无 cancel 覆盖）

**调研缺口：** Cursor 无公开 `kill_shell` 协议文档；Reasonix `kill_shell` 仅见于矩阵对照，无本地源码。
