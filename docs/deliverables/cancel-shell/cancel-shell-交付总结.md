# cancel-shell 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | cancel-shell |
| 完成日期 | 2026-06-10 |
| 选定方案 | 提案 1 – 扩展 TaskStop 统一取消后台任务 |
| 审查结论 | 通过 |
| 单测 | 全绿（629/629） |

---

## 1. 概述

**需求：** Agent 可取消仍在运行的后台 Bash（`run_in_background`），补齐工具矩阵「取消 Shell」缺口。

**本轮目标：** TaskStop 同时支持子代理与后台 shell；用户 Stop 回合时杀同 session shell。

**选型：** 推荐并选定提案 1；无额外调整。

**交付物目录：** `docs/deliverables/cancel-shell/`，过程稿见 `_artifacts/`。

---

## 2. 方案

扩展既有 **TaskStop**：`agent-bash-tasks.ts` 保存 `ChildProcess`，`stopShellTask` 发 SIGTERM 并标记 `stopped`；`TaskOutput` 继续读输出；`stopAgentTurn` 调 `stopShellTasksForSession`。

**影响范围：** agent-bash-tasks、agent-ext-executor、agent-loop、tool-executor、agent-tool-prompts-ext。

**已知限制：** 前台同步 Bash 无 task_id，不可 TaskStop 取消。

---

## 3. 方案选型过程

| 维度 | 提案 1 TaskStop | 提案 2 KillShell |
|------|-----------------|------------------|
| 核心思路 | 统一 TaskStop | 新工具 KillShell |
| 工作量 | 小 | 中 |

**用户选择：** 提案 1，无额外调整。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

1. TDD：UT-cancel-shell
2. agent-bash-tasks 进程 kill API
3. TaskStop / stopAgentTurn 接线
4. 全量 npm test

全文：`_artifacts/plan-cancel-shell.md`

---

## 5. 实现说明

- `stopShellTask`、`stopShellTasksForSession`
- TaskStop 先子代理后 shell
- 后台 Bash 传 `sessionId`

详见 `_artifacts/05-implement-report.md`

---

## 6. 单元测试执行情况

- 专项：`UT-cancel-shell` 3/3 通过
- 全量：133 文件、629 用例全绿

详见 `_artifacts/05-unittest.md`

---

## 7. 测试报告

- 自动化：Vitest 全绿
- 手工/集成：待补充（可在 UI 启动长命令 + Agent TaskStop 验证）

---

## 8. 代码审查

结论：**通过**。无阻塞项。待办：前台 Bash abort、Chat 取消按钮。

详见 `_artifacts/06-code-review.md`

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-bash-tasks.ts` | 修改 | stopShellTask、stopped 状态 |
| `electron/main/agent/agent-ext-executor.ts` | 修改 | TaskStop 合并 shell |
| `electron/main/agent/agent-loop.ts` | 修改 | stopAgentTurn 杀 shell |
| `electron/main/agent/tool-executor.ts` | 修改 | 传 sessionId |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 修改 | TaskStop 描述 |
| `tests/unittest/UT-cancel-shell/cancel-shell.test.ts` | 新增 | 取消 shell 单测 |

---

## 10. 遗留项与后续建议

- 前台同步 Bash 取消（需 abortController 或进程注册表扩展）
- Chat UI 取消按钮
- Windows 专项 cancel 测试加强

---

## 11. 附录：过程文档索引

| 文件 | 说明 |
|------|------|
| `_artifacts/00-research-links.md` | 调研链接 |
| `_artifacts/02-selection.md` | 选型记录 |
| `_artifacts/proposal-cancel-shell.md` | 已确认方案 |
| `_artifacts/plan-cancel-shell.md` | 实施计划 |
| `_artifacts/05-implement-report.md` | 实现报告 |
| `_artifacts/05-unittest.md` | 单测输出 |
| `_artifacts/06-code-review.md` | 代码审查 |
