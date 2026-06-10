# 调研链接

- `docs/research/research-agent-tools-matrix.md` — §2「Shell 交互 stdin」：AxeCoder 未实现；DeepSeek-TUI 有 `exec_shell_interact`；Cursor 部分 `WRITE_SHELL_STDIN`
- `docs/research/research-cursor-agent-tools.md` — enum 55 `WRITE_SHELL_STDIN`、§7 交互式 Shell 输入
- `docs/deliverables/agent-bash-parity/_artifacts/proposal-agent-bash-parity.md` — 既有 Bash 契约、`run_in_background` + `TaskOutput`
- `electron/main/agent/agent-bash-tasks.ts` — 后台 shell 任务（当前 `stdio: ['ignore', ...]`，无 stdin 管道）
- `electron/main/agent/agent-bash.ts` — 前台非交互 `spawn`
- `electron/main/agent/agent-browser-playwright.ts` — 子进程 stdin JSON 行写入参考模式

**调研缺口：** 本地无 DeepSeek-TUI / Cursor 源码；`WRITE_SHELL_STDIN` 精确参数 schema 以矩阵语义 + 既有 Bash/TaskOutput 组合推断。
