# 功能实现报告：取消 Shell

## 功能说明

- 后台 Bash（`run_in_background: true`）启动后，Agent 可通过 **TaskStop** + `task_id` 终止进程。
- `stopShellTask` 发送 SIGTERM，run.status 变为 `stopped`；TaskOutput 仍可读取最终输出。
- 用户点击 Stop Agent 回合时，`stopAgentTurn` 同步终止同 session 下所有 running 后台 shell。
- 对已 completed/failed/stopped 的 task_id 再次 TaskStop 返回 ok（幂等）。

## 修改文件列表

| 文件 | 说明 |
|------|------|
| `electron/main/agent/agent-bash-tasks.ts` | `stopped` 状态、`stopShellTask`、`stopShellTasksForSession`、`sessionId` |
| `electron/main/agent/agent-ext-executor.ts` | TaskStop 合并 shell 分支 |
| `electron/main/agent/agent-loop.ts` | `stopAgentTurn` 调用 `stopShellTasksForSession` |
| `electron/main/agent/tool-executor.ts` | 后台 Bash 传递 `sessionId` |
| `electron/main/agent/agent-tool-prompts-ext.ts` | TaskStop 描述更新 |
| `tests/unittest/UT-cancel-shell/cancel-shell.test.ts` | 新增单测 |

## 单元测试覆盖

- `stopShellTask` 终止 `sleep 60` 后台任务 → status `stopped`
- 已完成 echo 任务再次 stop 幂等
- `executeExtendedAgentTool TaskStop` 对 shell task_id 返回 ok

## 注意事项

- 前台同步 Bash（非 background）无 task_id，TaskStop 无法取消。
- Windows 使用 `powershell Start-Sleep` 测 cancel；与 agent-bash-parity 一致。
- 复用 shell-interactive-stdin 已引入的 `procById` 进程表，无重复 Map。
