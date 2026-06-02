# model-tier-routing 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | model-tier-routing |
| 完成日期 | 2026-06-02 |
| 选定方案 | 提案 1 – 双模型槽位 + 任务类型规则分流 |
| 审查结论 | 通过 |
| 单测 | 全绿（244/244） |

---

## 1. 概述

为 AxeCoder 增加 **主模型 + 快速模型** 档位：复杂/主路径用 `activeModelId`，探索类子任务用可选 `fastModelId`（未配置则回退主模型）。

**选型：** 用户跳过 AskQuestion，采用推荐提案 1；保留 `activeModelId`；工坊经理与实现角色用主模型，仅测试角色走快速模型。

**交付物：** `docs/deliverables/model-tier-routing/`，过程稿 `_artifacts/`。

---

## 2. 方案

- `models.json` 增加 `fastModelId`
- `resolveModelIdForTask('main' | 'subagent')` + `agentModelTierRoutingEnabled`
- Agent 工具：`explore`/`plan` → fast；`generalPurpose` → main
- 设置 → 模型 Tab：「快速模型（子任务）」下拉

---

## 3. 方案选型过程

推荐提案 1；用户跳过问卷后默认选定。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

分阶段：解析模块 → 存储/IPC → Agent/工坊接入 → UI。全文 `_artifacts/plan-model-tier-routing.md`。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

- `npm test`：55 文件、244 用例通过
- 新增 `UT-model-tier-routing`（10 例）
- 详情：`_artifacts/05-unittest.md`

---

## 7. 测试报告

| 场景 | 预期 |
|------|------|
| 未设 fast | 子 Agent 仍用主模型 |
| 设 fast + explore 子 Agent | 调用 fast 条目 |
| 工坊经理发言 | 主模型 |
| 工坊测试发言 | 快速模型（若已配置） |

手工：设置 → 模型 → 选快速模型 → Chat 触发 explore 子 Agent 观察模型名/日志。

---

## 8. 代码审查

通过。待办：General Tab 分流开关、Agent 工具 model 参数。`_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/ai/model-resolve.ts` | 新增 | 档位解析 |
| `electron/main/models-*` | 修改 | fastModelId、setFast |
| `electron/main/agent/tool-executor.ts` | 修改 | Agent 选模 |
| `electron/main/workshop/workshop-*-speaker.ts` | 修改 | 工坊选模 |
| `src/components/workbench/ModelsTab.vue` | 修改 | UI |
| `tests/unittest/UT-model-tier-routing/*` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

- 主会话按复杂度自动切换（V2）
- `agentModelTierRoutingEnabled` 暴露到设置 General Tab
- Agent 工具可选 `model` 参数（提案 2）

---

## 11. 附录：过程文档索引

- `_artifacts/00-research-links.md`
- `_artifacts/02-selection.md`
- `_artifacts/proposal-model-tier-routing.md`
- `_artifacts/plan-model-tier-routing.md`
- `_artifacts/05-implement-report.md`
- `_artifacts/05-unittest.md`
- `_artifacts/06-code-review.md`
