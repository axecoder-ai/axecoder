# 功能实现报告

## 功能说明

1. **EnterWorktree / ExitWorktree** — `agent-worktree.ts` 实现 git worktree 创建/移除；检测已在 worktree 则跳过；`.worktrees/` 自动写入 `.gitignore`；切换 `ctx.projectRoot` 与会话 `projectRoot`。
2. **Workflow** — `agent-workflow.ts` 按 skill → custom command → builtin command 加载 playbook，工具结果返回完整正文。
3. **Brief** — `tool-executor.ts` 在 feature 开启时返回 `ask_pending`，复用 `ChatAskUserCard`（含「其他」自由文本）。

## 修改文件

| 文件 | 说明 |
|------|------|
| `electron/main/agent/agent-worktree.ts` | 新增 |
| `electron/main/agent/agent-workflow.ts` | 新增 |
| `electron/main/agent/agent-ext-executor.ts` | Worktree/Workflow 接线 |
| `electron/main/agent/tool-executor.ts` | Brief + AgentContext worktree 字段 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 工具描述更新 |
| `tests/unittest/UT-agent-worktree-workflow-brief/worktree-workflow-brief.test.ts` | 新增单测 |

## 注意事项

- feature flag 默认仍为 `false`，需在设置中开启 `agentFeatureWorktree` / `agentFeatureWorkflow` / `agentFeatureBrief`。
- Worktree 仅切换 Agent 会话根目录，不切换 IDE 打开的项目文件夹。
- ExitWorktree 对 `git worktree remove` 为 best-effort（失败仍恢复 projectRoot）。
