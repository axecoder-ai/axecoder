# 功能实现报告

## 功能说明

1. **ShellStdin 工具**：向运行中的后台 shell 任务（`Bash` + `run_in_background`）写入 stdin；支持 `close_stdin` 发送 EOF。
2. **Bash stdin 参数**：启动时一次性管道输入（前台/后台均可）。
3. **后台 shell stdin pipe**：`agent-bash-tasks` 保留进程句柄直至任务结束；`TaskOutput` 输出含 `Stdin open` 状态。

交互流：`Bash(run_in_background)` → `TaskOutput` 读 prompt → `ShellStdin` → 再 `TaskOutput`。

## 修改文件列表

| 路径 | 说明 |
|------|------|
| `electron/main/agent/agent-bash-tasks.ts` | stdin pipe、writeShellStdin、initial stdin |
| `electron/main/agent/agent-bash.ts` | parseBashStdin、前台 stdin pipe |
| `electron/main/agent/agent-types.ts` | ShellStdin 工具名 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | ShellStdin schema |
| `electron/main/agent/agent-tool-prompts.ts` | Bash stdin 参数与描述 |
| `electron/main/agent/agent-ext-executor.ts` | ShellStdin 执行 |
| `electron/main/agent/agent-permissions.ts` | ShellStdin 只读自动允许 |
| `electron/main/agent/tool-executor.ts` | Bash stdin 透传 |
| `tests/unittest/UT-shell-interactive-stdin/shell-interactive-stdin.test.ts` | 新增 9 用例 |
| `tests/unittest/UT-agent-os-sandbox/bash-integration.test.ts` | 修复 execpolicy mock（全绿） |

## 单测覆盖

- 工具注册（Bash.stdin、ShellStdin）
- writeShellStdin：不存在/非 running/写入/close_stdin
- 后台 initial stdin、前台 runAgentBash stdin
- ext executor ShellStdin 路径

## 注意事项

- stdin 单次上限 64KB（`MAX_BASH_STDIN_CHARS`）。
- ShellStdin 不经用户 pending 批准（仅写已批准任务的 stdin）。
- 不实现持久跨调用 shell 会话；每命令仍独立后台任务。
