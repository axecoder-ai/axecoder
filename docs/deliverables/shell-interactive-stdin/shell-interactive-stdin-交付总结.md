---
任务名: shell-interactive-stdin
完成日期: 2026-06-10
选定方案: 提案 1 + Bash stdin 参数合并
审查结论: 通过
单测全绿: 是（626/626）
---

# shell-interactive-stdin — 交付总结

## 1. 概述

**需求：** 在本系统实现 Agent「Shell 交互 stdin」，对齐工具矩阵 §2 缺口。

**目标：** 模型可对运行中的后台 Shell 写入 stdin，并支持 Bash 启动时一次性 stdin 管道。

**选型：** 推荐提案 1；用户选定提案 1，并合并 Bash 可选 `stdin` 参数。

**交付物目录：** `docs/deliverables/shell-interactive-stdin/`；过程稿见 `_artifacts/`。

---

## 2. 方案

新增 `ShellStdin` 工具（`task_id`、`input`、`close_stdin`）；扩展后台 Bash 为 stdin pipe；Bash 增加可选 `stdin` 一次性注入。交互流：`Bash(run_in_background)` → `TaskOutput` → `ShellStdin` → `TaskOutput`。

---

## 3. 方案选型过程

| 维度 | 提案 1 ShellStdin | 提案 2 Bash stdin only |
|------|-------------------|------------------------|
| 多轮交互 | 支持 | 不支持 |
| 工作量 | 中 | 小 |

**用户选择：** 提案 1 + Bash stdin 合并。

---

## 4. 实施计划

阶段：单测 TDD → `agent-bash-tasks` / `agent-bash` / executor / prompts → 全量回归。

全文见 `_artifacts/plan-shell-interactive-stdin.md`。

---

## 5. 实现说明

- `writeShellStdin` + 后台 `procById` 管道
- `parseBashStdin` + 前台/后台启动注入
- `ShellStdin` 注册于扩展工具集，permissions 自动 allow

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

- 专项：9/9 通过
- 全量：626/626 通过

详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- Mock spawn 覆盖 stdin write/end/close
- 集成：`startBackgroundBash` + `writeShellStdin` + ext executor
- 手工：Windows 交互 CLI 待补充

---

## 8. 代码审查

**结论：通过**。无阻塞项。

详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-bash-tasks.ts` | 修改 | stdin pipe、writeShellStdin |
| `electron/main/agent/agent-bash.ts` | 修改 | parseBashStdin、前台 stdin |
| `electron/main/agent/agent-types.ts` | 修改 | ShellStdin 类型 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 修改 | ShellStdin 定义 |
| `electron/main/agent/agent-tool-prompts.ts` | 修改 | Bash stdin |
| `electron/main/agent/agent-ext-executor.ts` | 修改 | ShellStdin 执行 |
| `electron/main/agent/agent-permissions.ts` | 修改 | 权限 |
| `electron/main/agent/tool-executor.ts` | 修改 | stdin 透传 |
| `tests/unittest/UT-shell-interactive-stdin/*` | 新增 | 9 用例 |
| `tests/unittest/UT-agent-os-sandbox/bash-integration.test.ts` | 修改 | mock 修复 |

---

## 10. 遗留项与后续建议

- 更新 `research-agent-tools-matrix.md` AxeCoder 列为「已实现」
- TaskStop 支持 shell 任务
- Windows 交互 shell 专项测试

---

## 11. 附录：过程文档索引

| 文件 | 说明 |
|------|------|
| `_artifacts/00-research-links.md` | 调研链接 |
| `_artifacts/02-selection.md` | 选型记录 |
| `_artifacts/proposal-shell-interactive-stdin.md` | 已确认方案 |
| `_artifacts/plan-shell-interactive-stdin.md` | 实施计划 |
| `_artifacts/05-implement-report.md` | 实现报告 |
| `_artifacts/05-unittest.md` | 单测结果 |
| `_artifacts/06-code-review.md` | 代码审查 |
