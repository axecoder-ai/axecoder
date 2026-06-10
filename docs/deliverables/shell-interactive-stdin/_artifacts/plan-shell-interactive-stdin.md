# Shell 交互 stdin — 实施计划

**desired_location:** `docs/plans/plan-shell-interactive-stdin.md`

## 当前背景

- `agent-bash-tasks.ts` 后台 spawn 使用 `stdio: ['ignore', 'pipe', 'pipe']`，无 stdin 管道。
- 矩阵 §2「Shell 交互 stdin」AxeCoder 为未实现；Cursor 为 `WRITE_SHELL_STDIN`。
- 已有 `run_in_background` + `TaskOutput` 读后台输出。

## 需求

### 功能需求

1. 新工具 `ShellStdin`：`task_id`（必填）、`input`（必填）、`close_stdin`（可选 bool，默认 false）。
2. 仅对 `agent-bash-tasks` 中 status=running 且 stdin 未关闭的任务写入；已结束返回明确错误。
3. 后台 Bash spawn 改为 stdin pipe，保留 `ChildProcess` 至 close。
4. Bash 可选 `stdin`：前台/后台启动后写入并 `end()` stdin。
5. 更新 Bash / ShellStdin 工具描述与权限注册。

### 非功能需求

- stdin 单次写入上限 64KB；与 trim 策略独立。
- ShellStdin 不需用户 pending 批准（只写已有已批准任务的 stdin）。

## 设计决策

1. **ShellStdin 走 ext executor 立即执行** — 与 TaskOutput 一致，不新增 pending 类型。
2. **Bash stdin 在 apply 时注入** — 与 command 同批批准。
3. **不引入持久 shell 会话 id** — 仍一命令一后台任务。

## 实施计划

### 阶段 1：单测（TDD）

1. 新建 `UT-shell-interactive-stdin`：writeShellStdin 成功/任务不存在/已结束；Bash stdin 前台 mock；后台 initial stdin。

### 阶段 2：主进程

1. `agent-bash-tasks.ts` — pipe stdin、writeShellStdin、initial stdin opts。
2. `agent-bash.ts` — 前台 stdin pipe。
3. `tool-executor.ts` — Bash stdin 透传至 apply/startBackgroundBash。
4. `agent-ext-executor.ts` + prompts + types + permissions。

### 阶段 3：验收

1. `npm test`；落盘 05 报告。

## 文件变更清单

| 路径 | 操作 |
|------|------|
| `electron/main/agent/agent-bash-tasks.ts` | 修改 |
| `electron/main/agent/agent-bash.ts` | 修改 |
| `electron/main/agent/agent-types.ts` | 修改 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 修改 |
| `electron/main/agent/agent-tool-prompts.ts` | 修改 |
| `electron/main/agent/agent-ext-executor.ts` | 修改 |
| `electron/main/agent/agent-permissions.ts` | 修改 |
| `electron/main/agent/tool-executor.ts` | 修改 |
| `tests/unittest/UT-shell-interactive-stdin/*` | 新增 |

## 测试策略

- mock `node:child_process` spawn，捕获 stdin.write/end。
- 集成风格：模拟 running task Map + writeShellStdin。
