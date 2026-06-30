# worktree-workflow-brief 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | worktree-workflow-brief |
| 完成日期 | 2026-06-30 |
| 选定方案 | 提案 1 – 单模块最小真实现 |
| 审查结论 | 通过 |
| 单测 | 全绿（6/6） |

---

## 1. 概述

**需求：** Agent 工具 `EnterWorktree`/`ExitWorktree`、`Workflow`、`Brief` 从 stub 升级为可调用实现。

**目标：** 对齐 git worktree 隔离、斜杠工作流 playbook、Brief 用户交互；保持 feature flag 默认关闭。

**选型：** 推荐并采用提案 1（最小真实现）；用户无额外调整。

**交付物目录：** `docs/deliverables/worktree-workflow-brief/_artifacts/`

---

## 2. 方案

- **Worktree：** `agent-worktree.ts` — `runGit` 管理 `.worktrees/<branch>`，切换 `ctx.projectRoot`。
- **Workflow：** `agent-workflow.ts` — skill → custom → builtin 加载 playbook。
- **Brief：** `tool-executor.ts` — `ask_pending` 复用 Ask 卡片。

详见 `_artifacts/proposal-worktree-workflow-brief.md`。

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 改动面 | 小（~2 新模块） | 大（+ renderer/IPC） |
| Brief | 复用 Ask | 专用 UI |
| 推荐 | ✅ | — |

**用户选择：** 提案 1，无调整。全文见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

三阶段：worktree/workflow 模块 → executor 接线 → vitest。见 `_artifacts/plan-worktree-workflow-brief.md`。

---

## 5. 实现说明

- 新增 `agent-worktree.ts`、`agent-workflow.ts`
- `agent-ext-executor.ts` 接线 Worktree/Workflow
- `tool-executor.ts` 处理 Brief + `worktreeOriginalRoot`/`worktreePath`

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

```bash
npx vitest run tests/unittest/UT-agent-worktree-workflow-brief/worktree-workflow-brief.test.ts
```

**6 passed / 0 failed — 全绿。** 详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 单测覆盖：worktree enter/exit/already-there、workflow 加载、Brief pending。
- 手工验证建议：开启 `agentFeatureWorktree` 后 EnterWorktree → Read 验证路径落在 `.worktrees/`。
- 集成/E2E：待补充。

---

## 8. 代码审查

**结论：通过。** 无阻塞项。非阻塞：IDE 根目录不同步；Brief 依赖「其他」填写。

详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-worktree.ts` | 新增 | git worktree 真实现 |
| `electron/main/agent/agent-workflow.ts` | 新增 | playbook 加载 |
| `electron/main/agent/agent-ext-executor.ts` | 修改 | 接线 |
| `electron/main/agent/tool-executor.ts` | 修改 | Brief + ctx 字段 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 修改 | 工具描述 |
| `tests/unittest/UT-agent-worktree-workflow-brief/*.test.ts` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

- IDE 打开文件夹与 Agent `projectRoot` 联动（长期）。
- `best-of-n-runner` 自动 EnterWorktree（单独 rppit）。
- Brief 专用单行输入 UI（若产品需要）。

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-worktree-workflow-brief.md` |
| 计划 | `_artifacts/plan-worktree-workflow-brief.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 审查 | `_artifacts/06-code-review.md` |
