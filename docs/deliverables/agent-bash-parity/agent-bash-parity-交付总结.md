# agent-bash-parity 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | agent-bash-parity |
| 完成日期 | 2026-06-04 |
| 选定方案 | 提案 2 – 契约对齐 + 轻量后台 |
| 审查结论 | 通过 |
| 相关单测全绿 | 是（27/27，Bash 子集） |

---

## 1. 概述

**需求：** 将 Claude Code 的 `Bash` 能力移植到 AxeCoder。

**本轮目标：** 对齐 CC 对外 API（`timeout`、`description`、`run_in_background`）与后台任务 + `TaskOutput`；不引入持久 shell 与自动后台。

**选型：** 推荐提案 1（完整 1:1），用户选定 **提案 2**；调整：首版 macOS/Linux，Windows 持久 shell 后续。

**交付物目录：** `docs/deliverables/agent-bash-parity/`，过程稿 `_artifacts/`。

---

## 2. 方案

见 `_artifacts/proposal-agent-bash-parity.md`（**状态：已确认**）。

要点：单次 `spawn` 前台/后台；`TaskOutput` 可读 `shell-*` 任务；`BASH_DESCRIPTION` 与 schema 与 CC 文档一致。

---

## 3. 方案选型过程

见 `_artifacts/02-selection.md`。用户最终选提案 2 + Windows 后续。

---

## 4. 实施计划

见 `_artifacts/plan-agent-bash-parity.md`（阶段：单测 → 主进程 → UI → 验收）。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。

**功能点摘要：**

- `agent-bash-tasks.ts` 后台任务
- `parseBashTimeoutMs` / `formatBackgroundBashStarted`
- `ChatBashCard` 展示 description

---

## 6. 单元测试执行情况

见 `_artifacts/05-unittest.md`。

- 命令：Bash 相关 5 个测试文件
- 结果：**27 passed，0 failed**
- 全量 `npm test`：13 个历史失败（非本轮引入）

---

## 7. 测试报告

| 场景 | 结果 |
|------|------|
| 前台 echo | 单测通过 |
| 后台 echo + TaskOutput 格式 | 单测通过 |
| schema 含 timeout/description/run_in_background | 单测通过 |
| 手工 Chat 批准流 | 待补充 |

---

## 8. 代码审查

见 `_artifacts/06-code-review.md`。**结论：通过。** 待办：持久会话、TaskStop(shell)、Windows 手测。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-bash-tasks.ts` | 新增 | 后台 shell 任务 |
| `electron/main/agent/agent-bash.ts` | 修改 | 超时解析与后台 started 文案 |
| `electron/main/agent/agent-tool-prompts.ts` | 修改 | Bash schema/description |
| `electron/main/agent/tool-executor.ts` | 修改 | 参数与 apply |
| `electron/main/agent/agent-ext-executor.ts` | 修改 | TaskOutput 查 shell |
| `electron/main/agent/agent-types.ts` | 修改 | PendingBash 类型 |
| `electron/main/agent/agent-session-store.ts` | 修改 | 序列化 |
| `src/types/axecoder.d.ts` | 修改 | 前端类型 |
| `src/components/workbench/ChatBashCard.vue` | 修改 | UI |
| `tests/unittest/UT-agent-bash-parity/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

1. **提案 1**：持久 bash 会话、`ASSISTANT_BLOCKING_BUDGET_MS` 自动后台
2. **沙箱 / bash classifier**（CC 完整安全层）
3. **`TaskStop`** 支持终止 shell 后台任务
4. **Windows** 平台验证
5. 清理全仓 13 个历史单测失败

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型记录 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-agent-bash-parity.md` |
| 实施计划 | `_artifacts/plan-agent-bash-parity.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测记录 | `_artifacts/05-unittest.md` |
| 代码审查 | `_artifacts/06-code-review.md` |
