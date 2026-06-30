---
任务名: git-github-first-class-ci
完成日期: 2026-06-30
选定方案: 提案 2 – Git 只读原生工具 + Bash CI
审查结论: 通过
单测: 854/854 全绿
---

# Git/GitHub 一等公民 + CI — 交付总结

## 1. 概述

**需求：** Git/GitHub 成为 Agent 一等公民；CI/PR 远程操作仍经 Bash + git-forge 注入。

**本轮目标：** GitStatus/GitDiff/GitLog 只读工具 + CI prompt/只读 gh + 子代理 forge 注入 + `/investigate-ci`。

**选型：** 推荐提案 1；用户选定 **提案 2**（含 Git 原生只读工具）。

**交付目录：** `docs/deliverables/git-github-first-class-ci/_artifacts/`

---

## 2. 方案

- Git 三工具只读执行，无需批准。
- forge-prompt 增加 CI 段；gh `run`/`workflow` 只读自动放行。
- 子代理 system prompt 含 forge；ci-investigator/git-commit 前缀对齐 gh checks 流程。
- **不**新增 `github_*` REST 工具。

详见 `_artifacts/proposal-git-github-first-class-ci.md`。

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2（选定） |
|------|--------|----------------|
| Git 工具 | 无 | GitStatus/GitDiff/GitLog |
| CI 路径 | Bash+forge | 同左 |

用户调整：无。记录见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

阶段：forge CI → Git 工具 → IPC/斜杠 → 单测。见 `_artifacts/plan-git-github-first-class-ci.md`。

---

## 5. 实现说明

- `electron/main/git-forge/git-agent-read.ts` — Git 工具后端
- `forge-prompt.ts` — `getGitCiPromptSection`、`buildInvestigateCiPrompt`
- `agent-tool-prompts.ts` — Git 工具注册 + Bash 描述
- `tool-executor.ts` — Git 工具分支
- `/investigate-ci`（别名 `/ci`）

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

- 全量 **854/854** 通过
- 本轮 git 相关 20 项通过

详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 单测覆盖 forge CI prompt、gh 只读、临时 git 仓库三工具。
- 手工：待用户在 GitHub 仓库验证 `/investigate-ci` 与 `Task ci-investigator`。

---

## 8. 代码审查

**结论：通过**。无阻塞项。见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/git-forge/git-agent-read.ts` | 新增 | Git 只读工具实现 |
| `electron/main/git-forge/forge-prompt.ts` | 修改 | CI prompt |
| `electron/main/agent/agent-bash-readonly.ts` | 修改 | gh CI 只读 |
| `electron/main/agent/agent-subagent-types.ts` | 修改 | 子代理前缀 |
| `electron/main/agent/agent-system-prompt.ts` | 修改 | 子代理 forge |
| `electron/main/agent/agent-tool-prompts.ts` | 修改 | Git 工具 + RevertTurn 描述 |
| `electron/main/agent/agent-types.ts` | 修改 | 工具名 |
| `electron/main/agent/tool-executor.ts` | 修改 | 执行分支 |
| `electron/main/git-ipc.ts` | 修改 | investigateCi IPC |
| `electron/preload/index.ts` | 修改 | 桥接 |
| `src/types/axecoder.d.ts` | 修改 | 类型 |
| `src/slash-commands/builtin.ts` | 修改 | `/investigate-ci` |
| `tests/unittest/UT-git-forge/git-forge-ci.test.ts` | 新增 | CI 单测 |
| `tests/unittest/UT-git-agent-tools/git-agent-tools.test.ts` | 新增 | Git 工具单测 |

---

## 10. 遗留项与后续建议

- `/investigate-ci` 读取 session linkedPrUrl（IPC）
- Gitee CI 模板用户验证
- 主 Agent 续轮时刷新 Environment 中的 linkedPrUrl

---

## 11. 附录：过程文档索引

| 文件 |
|------|
| `_artifacts/00-research-links.md` |
| `_artifacts/02-selection.md` |
| `_artifacts/proposal-git-github-first-class-ci.md` |
| `_artifacts/plan-git-github-first-class-ci.md` |
| `_artifacts/05-implement-report.md` |
| `_artifacts/05-unittest.md` |
| `_artifacts/06-code-review.md` |
