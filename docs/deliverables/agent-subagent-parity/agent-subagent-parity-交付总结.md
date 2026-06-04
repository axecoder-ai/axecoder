# agent-subagent-parity 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | agent-subagent-parity |
| 完成日期 | 2026-06-04 |
| 选定方案 | 提案 1 – CC Task 契约全量 1:1（Chat-only） |
| 审查结论 | 通过 |
| 单测 | 全绿（337/337） |

---

## 1. 概述

**需求：** 将 Cursor Composer（CC）**子代理（Task）**能力 **1:1** 移植到 AxeCoder。

**本轮目标：** Chat Agent 注册 Task 工具、8 种专型、resume/interrupt/model/readonly、后台 output + TaskOutput block；**不改 Workshop**。

**选型：** 用户确认提案 1 + **仅 Chat** 范围。

**交付物目录：** `docs/deliverables/agent-subagent-parity/` · 过程稿 `_artifacts/`

---

## 2. 方案

- Task 为主、`Agent` 为别名
- `agent-subagent-types.ts` 专型 → 工具集 + prompt 前缀
- `.axecoder/subagents/` 存 resume transcript
- `.axecoder/subagent-output/{taskId}.txt` 后台输出

全文见 [_artifacts/proposal-agent-subagent-parity.md](./_artifacts/proposal-agent-subagent-parity.md)

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 思路 | Task 全量 1:1 | 最小参数补齐 |
| 与 CC | 一致 | 有差异清单 |
| 工作量 | 大 | 中 |

**推荐：** 提案 1。**用户选定：** 提案 1，**仅 Chat**。

详见 [_artifacts/02-selection.md](./_artifacts/02-selection.md)

---

## 4. 实施计划

阶段：单测 → types/store → subagent 循环 → tool-executor → Task schema → 全量测试。

全文见 [_artifacts/plan-agent-subagent-parity.md](./_artifacts/plan-agent-subagent-parity.md)

---

## 5. 实现说明

- 新增 `agent-subagent-types.ts`、`agent-subagent-store.ts`
- 扩展 `agent-subagent.ts`、`agent-subagent-tasks.ts`、`tool-executor.ts`
- Task 工具 schema、`Agent`→`Task` 别名、system prompt 委派段

详见 [_artifacts/05-implement-report.md](./_artifacts/05-implement-report.md)

---

## 6. 单元测试执行情况

`npm test` — **80 files, 337 tests, 全绿**

详见 [_artifacts/05-unittest.md](./_artifacts/05-unittest.md)

---

## 7. 测试报告

- **自动化：** 见 §6；新增 `UT-agent-subagent-parity` 8 项。
- **手工（建议）：** Chat 启动 `Task(explore)` 后台 + `TaskOutput(block:true)`；`resume` 续跑同一 agent id。

---

## 8. 代码审查

**结论：通过。** 无阻塞项。

详见 [_artifacts/06-code-review.md](./_artifacts/06-code-review.md)

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-subagent-types.ts` | 新增 | CC 专型配置 |
| `electron/main/agent/agent-subagent-store.ts` | 新增 | resume 存储 |
| `electron/main/agent/agent-subagent.ts` | 修改 | 子代理循环增强 |
| `electron/main/agent/agent-subagent-tasks.ts` | 修改 | 后台 output/block |
| `electron/main/agent/tool-executor.ts` | 修改 | Task 执行 |
| `electron/main/agent/agent-tool-prompts.ts` | 修改 | Task schema |
| `electron/main/agent/agent-tool-aliases.ts` | 修改 | Agent→Task |
| `electron/main/agent/agent-types.ts` | 修改 | 类型扩展 |
| `tests/unittest/UT-agent-subagent-parity/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

1. Rules 页 `.cursor/agents` 配置 UI。
2. `file_attachments` 图片内容注入模型多模态消息。
3. `best-of-n-runner` 与 worktree 特性联动。

---

## 11. 附录：过程文档索引

| 文件 | 说明 |
|------|------|
| [_artifacts/00-research-links.md](./_artifacts/00-research-links.md) | 调研链接 |
| [_artifacts/02-selection.md](./_artifacts/02-selection.md) | 选型 |
| [_artifacts/proposal-agent-subagent-parity.md](./_artifacts/proposal-agent-subagent-parity.md) | 已确认方案 |
| [_artifacts/plan-agent-subagent-parity.md](./_artifacts/plan-agent-subagent-parity.md) | 计划 |
| [_artifacts/05-implement-report.md](./_artifacts/05-implement-report.md) | 实现报告 |
| [_artifacts/05-unittest.md](./_artifacts/05-unittest.md) | 单测 |
| [_artifacts/06-code-review.md](./_artifacts/06-code-review.md) | 审查 |
