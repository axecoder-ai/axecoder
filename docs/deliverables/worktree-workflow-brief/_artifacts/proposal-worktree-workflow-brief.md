## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 将 `EnterWorktree`/`ExitWorktree`、`Workflow`、`Brief` 从 stub 升级为可调用真实现。
- **调研来源：** `docs/research/research-agent-tools-matrix.md` §4/§8/§11；`resources/builtin-skills/using-git-worktrees/SKILL.md`；`electron/main/agent/agent-ext-executor.ts:423-482`
- **上游提案：** `docs/proposals/proposal-worktree-workflow-brief.md`
- **选定基础：** 提案 1 – 单模块最小真实现（复用现有管线）
- **用户调整摘要：** 无额外调整，按提案原文落地

### 最终方案 – 单模块最小真实现

- **概述：** 新增 `agent-worktree.ts`、`agent-workflow.ts`；Worktree 用 `runGit` 管理 `.worktrees/<branch>` 并切换 `ctx.projectRoot`；Workflow 按 skill → custom → builtin 优先级加载 playbook；Brief 在 `tool-executor.ts` 构造 `ask_pending`（复用 ChatAskUserCard「其他」填写）。不改 renderer 结构。
- **相对选定提案的变更：** 无（用户未调整）
- **关键变更：**
  - `electron/main/agent/agent-worktree.ts`（新）
  - `electron/main/agent/agent-workflow.ts`（新）
  - `electron/main/agent/agent-ext-executor.ts` — Worktree/Workflow 接线
  - `electron/main/agent/tool-executor.ts` — Brief → ask_pending
  - `electron/main/agent/tool-executor.ts` — `AgentContext` 增加 worktree 字段
  - `agent-tool-prompts-ext.ts` — 更新工具描述
  - `tests/unittest/UT-agent-worktree-workflow-brief/`
- **权衡：** Agent ctx 根切换不联动 IDE 打开目录；Brief 依赖 Ask 卡片「其他」填自由文本
- **验证：** vitest mock `runGit`/fs；手工 EnterWorktree + Read 验证路径
- **待解决问题：** ExitWorktree 是否删除 worktree 目录（默认 `git worktree remove`）；IDE 工作区长期同步方案

### 未采纳方案说明

- **未选：** 提案 2 – Brief 专用 pending + best-of-n 自动 Enter
- **原因：** 用户选定最小实现，控制改动面
