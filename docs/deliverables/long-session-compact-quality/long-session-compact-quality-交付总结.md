# 长会话 compact 质量 — 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | long-session-compact-quality |
| 完成日期 | 2026-06-30 |
| 选定方案 | 提案 1 – 先摘要后 FRC + 滚动摘要沉淀 |
| 用户调整 | 必须同时升级 Chat `/compact` 为 LLM 摘要 |
| 审查结论 | 通过 |
| 单测 | 全绿（817/817） |

---

## 1. 概述

**需求：** 在已有 LLM compact 基础上，解决 Agent 长会话继续对话后质量下降；Chat `/compact` 同步 LLM 摘要。

**本轮目标：** 修复 FRC 与 compact 竞态；多轮滚动摘要；统一 Chat compact 管线。

**选型：** 推荐并选定提案 1；用户要求 Chat `/compact` 必做。

**交付物目录：** `docs/deliverables/long-session-compact-quality/_artifacts/`

---

## 2. 方案

- 超阈值时**先** LLM compact（完整 tool）→ **再** FRC
- `rollingCompactSummary` + `priorSummary` 多轮合并
- `chat:compact` / `/compact` 走 `compactChatHistoryWithLlm`

详见 `_artifacts/proposal-long-session-compact-quality.md`。

---

## 3. 方案选型过程

| 维度 | 提案 1（选定） | 提案 2 |
|------|----------------|--------|
| 核心 | 先摘要后 FRC + 滚动摘要 | 统一服务 + toolLog + 动态 keepTail |
| 改动 | 小 | 中 |

用户调整：Chat `/compact` 必须 LLM 化。

详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

阶段一摘要增强 → 阶段二 Agent 管线 → 阶段三 Chat 统一 → 阶段四 UT。

详见 `_artifacts/plan-long-session-compact-quality.md`。

---

## 5. 实现说明

- `agent-loop.ts`：调换 FRC/compact 顺序
- `agent-context-compact.ts`：`priorSummary`、`extractPriorCompactSummary`
- `chat-compact.ts`：`compactChatHistoryWithLlm`
- `builtin.ts`：`/compact` 传 modelId

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

- 命令：`npm test`
- 结果：171 文件、817 用例全通过
- 新增：`UT-long-session-compact-quality` 5 条

详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 自动化：UT 全绿
- 手工建议：构造 30+ turn Agent 会话触发自动 compact，追问早期文件路径；执行 `/compact` 验证 LLM 摘要文案

---

## 8. 代码审查

- 结论：**通过**
- P2：compact cooldown；矩阵文档同步；手动 compact IPC 写 rollingSummary

详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-context-compact.ts` | 修改 | priorSummary、extractPriorCompactSummary |
| `electron/main/agent/agent-loop.ts` | 修改 | 先 compact 后 FRC |
| `electron/main/agent/agent-session-store.ts` | 修改 | rollingCompactSummary |
| `electron/main/chat-compact.ts` | 修改 | compactChatHistoryWithLlm |
| `electron/main/agent-ipc.ts` | 修改 | chat:compact LLM |
| `electron/preload/index.ts` | 修改 | chatCompact 签名 |
| `src/types/axecoder.d.ts` | 修改 | 类型 |
| `src/slash-commands/builtin.ts` | 修改 | /compact modelId |
| `tests/unittest/UT-long-session-compact-quality/` | 新增 | 5 条 UT |

---

## 10. 遗留项与后续建议

1. `agentCompactCooldownTurns` Settings
2. 更新 `research-agent-tools-matrix.md` §12
3. `agent:compactMessages` 同步 `rollingCompactSummary`

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型记录 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-long-session-compact-quality.md` |
| 实施计划 | `_artifacts/plan-long-session-compact-quality.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测记录 | `_artifacts/05-unittest.md` |
| 代码审查 | `_artifacts/06-code-review.md` |
