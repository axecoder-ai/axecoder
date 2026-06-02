# model-dual-api-id 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | model-dual-api-id |
| 完成日期 | 2026-06-02 |
| 选定方案 | 提案 1 – 单条目双 API ID + 启发式复杂度路由 |
| 审查结论 | 通过 |
| 单测 | 全绿（14/14） |

---

## 1. 概述

**需求：** 同一模型配置下填写快速/深度两个 API 模型 ID；回答时按问题复杂度自动选用；废弃全局「快速模型（子任务）」第二条目下拉。

**选型：** 推荐与最终均为提案 1；用户要求废弃全局 fast 条目槽位。

**交付物目录：** `docs/deliverables/model-dual-api-id/`（过程稿见 `_artifacts/`）。

---

## 2. 方案

- `ModelEntry.modelId` = 深度 API；`fastApiModelId` = 快速 API（可选）。
- `resolveApiModelId(entry, tier, userText)`：`auto` 走启发式，`fast`/`deep` 强制。
- 子 Agent explore/plan、工坊 tester → `tier: fast`。
- 移除 `ModelsFile.fastModelId`、`setFastModel`、ModelsTab 全局下拉。

---

## 3. 方案选型过程

见 `_artifacts/02-selection.md`：提案 1 vs 2 vs 3；用户选定 1 + 废弃全局 fast。

---

## 4. 实施计划

见 `_artifacts/plan-model-dual-api-id.md`（类型 → 解析 → 调用链 → UI → 单测）。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。核心新增 `prompt-tier-heuristic.ts`、`api-model-resolve.ts`。

---

## 6. 单元测试执行情况

```bash
npm test -- tests/unittest/UT-model-dual-api-id tests/unittest/UT-model-tier-routing
```

14 passed，0 failed。**全绿**。详情 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 自动化：启发式 fast/deep、API 解析、model-resolve 条目 id 行为。
- 手工建议：设置 → 模型 → 编辑双 ID；短问/长问/含「重构」验证 Chat 与 Agent 是否走不同 API（可在 provider 日志或 mock 环境确认 model 字段）。

---

## 8. 代码审查

`_artifacts/06-code-review.md` — **通过**，无阻塞项。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/models-types.ts` | 修改 | fastApiModelId |
| `electron/main/models-store.ts` | 修改 | 迁移、去 setFastModel |
| `electron/main/ai/prompt-tier-heuristic.ts` | 新增 | 复杂度启发式 |
| `electron/main/ai/api-model-resolve.ts` | 新增 | API 名解析 |
| `electron/main/ai/model-resolve.ts` | 修改 | 恒 active 条目 |
| `electron/main/ai/chat-with-*.ts` | 修改 | apiModelId |
| `electron/main/agent/*` | 修改 | 注入 API |
| `electron/main/ai-ipc.ts` | 修改 | Chat auto |
| `electron/main/workshop/workshop-llm.ts` | 修改 | 工坊 API |
| `ModelFormDialog.vue` / `ModelsTab.vue` | 修改 | 双 ID UI |
| `preload` / `axecoder.d.ts` | 修改 | 类型清理 |
| `tests/unittest/UT-model-dual-api-id/*` | 新增 | 8 例 |
| `tests/unittest/UT-model-tier-routing/*` | 修改 | 6 例 |

---

## 10. 遗留项与后续建议

- V2：LLM 分类器或用户可编辑启发式规则。
- 手工验证各 provider（OpenAI/Ollama/Anthropic）双 ID 调用。

---

## 11. 附录：过程文档索引

| 文件 |
|------|
| `_artifacts/00-research-links.md` |
| `_artifacts/02-selection.md` |
| `_artifacts/proposal-model-dual-api-id.md` |
| `_artifacts/plan-model-dual-api-id.md` |
| `_artifacts/05-implement-report.md` |
| `_artifacts/05-unittest.md` |
| `_artifacts/06-code-review.md` |
