# worktree-workflow-brief 实施计划

## 当前背景

- `agent-ext-executor.ts` 中 EnterWorktree/ExitWorktree、Workflow、Brief 均为 stub（`agent-tool-layer-parity` Wave4）。
- 已有 `runGit`（`git-ipc.ts`）、`runSlashCommandForAgent`、AskUserQuestion pending 管线、`.cursor/skills/using-git-worktrees` 约定。

## 需求

### 功能需求

- **EnterWorktree：** 检测已在 worktree 则报告；否则在 `<toplevel>/.worktrees/<branch>` 创建并切换 `ctx.projectRoot`。
- **ExitWorktree：** 恢复 `originalProjectRoot`，`git worktree remove`（尽力而为）。
- **Workflow：** 按 name 加载 playbook（skill → custom command → builtin command），返回正文供 Agent 遵循。
- **Brief：** feature 开启时 `ask_pending` 单题，prompt 为 `message` 参数。

### 非功能需求

- feature flag 保持默认关；vitest 全绿；最小文件改动。

## 设计决策

1. **Worktree 状态放 AgentContext** — `worktreeOriginalRoot` / `worktreePath`，不新增 session 字段。
2. **Workflow 独立加载函数** — 对齐 `role-workflow-send.ts` 优先级，不直接绑 UI `roleWorkflowInvoke`。
3. **Brief 放 tool-executor** — 因需 `ask_pending` 返回类型，ext-executor 仅 immediate。

## 实施计划

1. **阶段一（0.5d）：** `agent-worktree.ts` + `agent-workflow.ts`
2. **阶段二（0.5d）：** executor 接线 + Brief + prompt 描述更新
3. **阶段三（0.5d）：** `UT-agent-worktree-workflow-brief` vitest

## 文件变更

| 路径 | 操作 |
|------|------|
| `electron/main/agent/agent-worktree.ts` | 新增 |
| `electron/main/agent/agent-workflow.ts` | 新增 |
| `electron/main/agent/agent-ext-executor.ts` | 修改 |
| `electron/main/agent/tool-executor.ts` | 修改 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 修改 |
| `tests/unittest/UT-agent-worktree-workflow-brief/*.test.ts` | 新增 |

## 测试策略

- mock `runGit`：enter/exit/already-in-worktree
- mock fs：workflow 加载顺序
- Brief：返回 `ask_pending` 且 questions 非空
