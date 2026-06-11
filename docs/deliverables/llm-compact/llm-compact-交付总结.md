# LLM 摘要式 compact — 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | llm-compact |
| 完成日期 | 2026-06-11 |
| 选定方案 | 提案 1 – Agent 内嵌 LLM 摘要 + 规则回退 |
| 审查结论 | 通过 |
| 单测 | 全绿（656/656） |

---

## 1. 概述

**需求：** 将 Agent 上下文 compact 从规则截断升级为 LLM 摘要，对齐 Claude Code `/compact`，保留关键决策与文件路径。

**本轮目标：** Agent 自动/手动 compact 使用 LLM 摘要；失败回退规则版；最小改动。

**选型：** 推荐提案 1；用户跳过 AskQuestion，按推荐落地。

**交付物目录：** `docs/deliverables/llm-compact/_artifacts/`

---

## 2. 方案

- `compactAgentMessagesWithLlm`：丢弃消息 → `chatWithProvider`（fast、无 tools）→ 摘要注入 `<system-reminder>`
- LLM 失败 → `ruleCompactSummary` 统计句
- `prepareSessionBeforeModel` 与 `agent:compactMessages` 走异步 LLM 路径
- 本轮不升级 Renderer `chat-compact`

---

## 3. 方案选型过程

| 维度 | 提案 1（选定） | 提案 2 |
|------|----------------|--------|
| 核心 | Agent 内嵌 LLM + 回退 | 独立服务 + Settings llm/rule |
| 改动 | 小 | 中 |

详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

阶段一：摘要核心 → 阶段二：agent-loop + IPC → 阶段三：UT。详见 `_artifacts/plan-llm-compact.md`。

---

## 5. 实现说明

- `agent-context-compact.ts`：`serializeMessagesForCompact`、`summarizeDroppedWithLlm`、`compactAgentMessagesWithLlm`
- `agent-loop.ts`：自动 compact 改 async
- `agent-ipc.ts`：`agent:compactMessages` 支持 modelId/sessionId

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

- 命令：`npm test`
- 结果：137 文件、656 用例全通过
- 新增：`UT-llm-compact` 3 条

详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 自动化：UT 全绿
- 手工建议：构造超长 Agent 会话触发自动 compact，验证后续 turn 能引用早期文件路径；断网或 mock 失败验证规则回退

---

## 8. 代码审查

- 结论：**通过**
- P2：统一 Chat `/compact`；Settings 开关；自动 compact 防抖

详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-context-compact.ts` | 修改 | LLM 摘要 + 回退 |
| `electron/main/agent/agent-loop.ts` | 修改 | 自动 compact async |
| `electron/main/agent-ipc.ts` | 修改 | IPC 传 modelId |
| `tests/unittest/UT-llm-compact/llm-compact.test.ts` | 新增 | LLM compact UT |

---

## 10. 遗留项与后续建议

1. Renderer `/compact` 复用同一摘要器
2. `agentCompactMode` Settings 开关
3. 更新调研矩阵 compact 行

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型记录 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-llm-compact.md` |
| 实施计划 | `_artifacts/plan-llm-compact.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测记录 | `_artifacts/05-unittest.md` |
| 代码审查 | `_artifacts/06-code-review.md` |
