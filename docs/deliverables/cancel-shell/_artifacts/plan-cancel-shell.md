# 取消 Shell 实施计划

**desired_location:** `docs/plans/plan-cancel-shell.md`

## 当前背景

- `agent-bash-parity` 已实现 `run_in_background` + `TaskOutput` 读后台 shell 输出。
- `agent-bash-tasks.ts` 仅 Map 存 run 元数据，未保存 `ChildProcess`，无法 kill。
- `TaskStop` 仅调用 `stopBackgroundRun`（子代理）；矩阵标 AxeCoder「取消 Shell = 部分 stop」。

## 需求

### 功能需求

- `TaskStop` 传入后台 shell 的 `task_id` 可终止进程，run.status 变为 `stopped`。
- `TaskOutput` 可读 stopped 任务的最终 stdout/stderr。
- 用户点 Stop Agent 回合时，终止同 session 下 running 后台 shell。
- 已 completed/failed/stopped 的 task_id 再次 TaskStop 不报错（返回当前状态或 ok）。

### 非功能需求

- 最小 diff；不新增工具名。
- macOS/Linux 单测覆盖（与 agent-bash-parity 一致）。

## 设计决策

### 1. 统一 TaskStop

扩展既有 `TaskStop`，不新增 KillShell：与 TaskOutput 成对，模型学习成本低。

### 2. 进程生命周期

`startBackgroundBash` 注册 `procs.set(id, proc)`；close/error/timeout/stop 时删除；手动 stop 先设 `run.status = 'stopped'` 再 `proc.kill('SIGTERM')`，close 回调不覆盖 stopped。

## 技术设计

### 文件变更

| 文件 | 变更 |
|------|------|
| `electron/main/agent/agent-bash-tasks.ts` | status 增 `stopped`；procs Map；`stopShellTask`；`stopShellTasksForSession`；`_resetShellTasksForTest` |
| `electron/main/agent/agent-ext-executor.ts` | TaskStop 合并 shell |
| `electron/main/agent/agent-loop.ts` | `stopAgentTurn` 调 `stopShellTasksForSession` |
| `electron/main/agent/agent-tool-prompts-ext.ts` | TaskStop 描述 |
| `electron/main/agent/tool-executor.ts` | `startBackgroundBash` 传 `sessionId` |
| `tests/unittest/UT-cancel-shell/cancel-shell.test.ts` | 新增 |

## 实施计划

1. **TDD 红**：写 cancel-shell 单测（sleep + TaskStop、幂等）。
2. **实现** agent-bash-tasks 进程表与 stop API。
3. **接线** ext-executor、agent-loop、tool-executor、prompts。
4. **绿**：`npm test` 全绿。

## 测试策略

### 单元测试

- `startBackgroundBash(sleep 30)` → `stopShellTask` → status `stopped`，进程不再 running。
- `executeAgentTool TaskStop` 对 shell task_id 返回 ok。
- 已完成 echo 任务 TaskStop 仍 ok（幂等）。

## 已知限制

- 前台同步 `runAgentBash` 不可通过 TaskStop 取消（无 task_id）。
- Windows 专项测试后续补。

## 参考资料

- `docs/deliverables/cancel-shell/_artifacts/02-selection.md`
- `docs/deliverables/agent-bash-parity/`
