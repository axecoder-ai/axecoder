---
任务名: bugbot-security-review
完成日期: 2026-06-10
选定方案: 提案 1 – Cursor 对齐专型 + Git Diff 预注入
审查结论: 通过
单测: 全绿（640/640）
---

# bugbot-security-review 交付总结

## 1. 概述

**需求：** 在 AxeCoder Chat Agent 中实现 Cursor 对齐的 `bugbot`（代码审查）与 `security-review`（安全审查）Task 子代理。

**本轮目标：** 补齐矩阵 §5 缺口，支持 Cursor review prompt 形状与 skill 委派。

**选型：** 推荐并选定提案 1（diff 预注入 + 专型 prompt + skill）；无额外调整。

**交付物目录：** `docs/deliverables/bugbot-security-review/_artifacts/`

---

## 2. 方案

**状态：** 已确认

在 `agent-subagent-types.ts` 新增 `bugbot`、`security-review` 只读专型；新增 `agent-review-diff.ts` 解析 `Full Repository Path` / `Diff` / `Base Branch` / `Custom Instructions` 并用 git 计算 diff；`runSubAgentTask` 启动审查子代理时预注入 diff；新增 `.cursor/skills/review-bugbot`、`review-security`。

**影响范围：** Chat Agent Task 子代理路径；Workshop 无变更。

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 核心 | diff 预注入 + skill | 仅 prompt，子代理自己 git |
| 工作量 | 中 | 小 |
| 对齐 Cursor | 是 | 否 |

**用户选择：** 提案 1，无额外调整。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

| 阶段 | 内容 |
|------|------|
| 1 | 单测 fixture |
| 2 | agent-review-diff.ts |
| 3 | types / model-resolve |
| 4 | subagent 注入 |
| 5 | prompts / skills |
| 6 | npm test 全绿 |

全文：`_artifacts/plan-bugbot-security-review.md`

---

## 5. 实现说明

- **专型：** `bugbot`、`security-review` 只读，12 turns，subagent 模型档位。
- **Diff：** `branch changes` = merge-base 至工作区；`uncommitted changes` = `git diff HEAD`。
- **注入：** 子代理 user 消息含 stat、diff、custom instructions、输出格式要求。
- **Skill：** 主 Agent 可按 `/review-bugbot`、`/review-security` skill 委派 Task。

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

- 专项：7/7 通过
- 全量：640/640 通过

详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- UT 覆盖 prompt 解析、类型过滤、fixture git diff、非 git 错误。
- 手工：Chat 中 `Task(subagent_type=bugbot, readonly=true)` + Cursor prompt 形状（待用户验收）。

---

## 8. 代码审查

**结论：通过**

非阻塞：超大 diff 分片审查、无 remote 仓库 base branch fallback。

详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-review-diff.ts` | 新增 | review prompt 解析与 git diff |
| `electron/main/agent/agent-subagent-types.ts` | 修改 | bugbot/security-review CONFIG |
| `electron/main/agent/agent-types.ts` | 修改 | SubagentType 扩展 |
| `electron/main/agent/agent-subagent.ts` | 修改 | diff 预注入 |
| `electron/main/agent/agent-tool-prompts.ts` | 修改 | Task 描述 |
| `electron/main/agent/agent-system-prompt.ts` | 修改 | 委派提示 |
| `electron/main/ai/model-resolve.ts` | 修改 | subagent 档位 |
| `.cursor/skills/review-bugbot/SKILL.md` | 新增 | Bugbot skill |
| `.cursor/skills/review-security/SKILL.md` | 新增 | Security skill |
| `tests/unittest/UT-bugbot-security-review/` | 新增 | 单测 |
| `docs/research/research-agent-tools-matrix.md` | 修改 | AxeCoder 列标已实现 |

---

## 10. 遗留项与后续建议

1. 与 Cursor 云端 Bugbot 规则 1:1 不对齐（本地 LLM + 专型 prompt）。
2. 超大 monorepo 可按文件分片审查。
3. 可选：slash command `/review-bugbot` 注册到 builtin commands。

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-bugbot-security-review.md` |
| 计划 | `_artifacts/plan-bugbot-security-review.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 代码审查 | `_artifacts/06-code-review.md` |
