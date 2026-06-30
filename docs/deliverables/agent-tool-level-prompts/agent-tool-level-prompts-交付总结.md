# agent-tool-level-prompts 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | agent-tool-level-prompts |
| 完成日期 | 2026-06-01 |
| 选定方案 | 提案 2 – 独立 agent-tool-prompts.ts |
| 用户调整 | strict（尽量加长 description） |
| 审查结论 | 通过 |
| 单测 | 全绿（41 passed） |

---

## 1. 概述

**需求：** 对齐 同类 Agent §14，为全部 Agent 内置工具实现 API `tools[].description` 与参数长说明。

**选型：** 推荐并采用提案 2；用户要求 strict 篇幅。

**交付物：** `docs/deliverables/agent-tool-level-prompts/`；过程稿 `_artifacts/`。

---

## 2. 方案

- 新建 `electron/main/agent/agent-tool-prompts.ts`，`buildAgentTools()` 返回 10 个 `AgentToolDef`。
- `agent-tool-defs.ts` 仅组装与 `SUB_AGENT_TOOLS` 过滤。
- **不做：** TodoWrite、WebFetch、Skill、MCP。

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 结构 | 单文件扩写 | 独立 prompts 模块 |
| 维护 | 低 | 高 |

用户选定提案 2 + strict。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

阶段：单测 → `agent-tool-prompts.ts` → defs 引用 → 验收。全文 `_artifacts/plan-agent-tool-level-prompts.md`。

---

## 5. 实现说明

- 每工具英文长 `description`（Bash/Agent ≥800 字符，其余 ≥400）。
- 覆盖：专用工具 vs Bash、Read-before-Edit、审批流、子代理边界、AskUser 时机。
- 详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

```bash
npm test -- tests/unittest/UT-agent-tool-level-prompts/ tests/unittest/UT-agent-glob/ tests/unittest/UT-agent-system-prompt/
```

**41 passed，全绿。** 详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 自动化：Vitest 41 项通过。
- 手工：未跑端到端模型调用；API 仍经 `chat-with-tools` 映射 `description`/`parameters`（与改前一致）。

---

## 8. 代码审查

**通过。** 无阻塞项。详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-tool-prompts.ts` | 新增 | §14 工具长描述 |
| `electron/main/agent/agent-tool-defs.ts` | 修改 | 引用 buildAgentTools |
| `tests/unittest/UT-agent-tool-level-prompts/*.test.ts` | 新增 | strict 单测 |

---

## 10. 遗留项与后续建议

- 获得 同类 Agent `src/tools/*/prompt.ts` 后可 diff 微调措辞。
- 新增内置工具时同步 prompts 模块。

---

## 11. 附录：过程文档索引

| 文件 |
|------|
| `_artifacts/00-research-links.md` |
| `_artifacts/02-selection.md` |
| `_artifacts/proposal-agent-tool-level-prompts.md` |
| `_artifacts/plan-agent-tool-level-prompts.md` |
| `_artifacts/05-implement-report.md` |
| `_artifacts/05-unittest.md` |
| `_artifacts/06-code-review.md` |
