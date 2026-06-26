# software-co-single-session 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | software-co-single-session |
| 完成日期 | 2026-06-22 |
| 选定方案 | 提案 1 – 单 Session 软 SOP |
| 审查结论 | 通过 |
| 单测 | 74/74 全绿 |

## 1. 概述

将 Software Co. 默认执行路径改为与 Agent 同源的**单 session 连续循环**；SOP（PRD/设计/任务/QA）降为软 prompt 引导。原 MetaGPT 硬编排通过 `AXECODER_SOP_STRICT=1` 保留。

交付目录：`docs/deliverables/software-co-single-session/`。

---

## 2. 方案

- 新建 `sop-fast-pipeline.ts`、`sop-mode.ts`
- `sendSopPipelineMessage` 默认委托 fast；strict 环境变量走原引擎
- `runWorkshopRoleAgentTurn({ sopFast })`：tools 全开、`chatMode: software-company`

全文见 `_artifacts/proposal-software-co-single-session.md`。

---

## 3. 方案选型过程

用户选定提案 1，无调整。见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

四步：fast 模块 → agent-loop/chat-mode → 分发与导出 → 单测。见 `_artifacts/plan-software-co-single-session.md`。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

```bash
npx vitest run tests/unittest/UT-sop-* tests/unittest/UT-chat-mode-lock tests/unittest/UT-collab-workshop
```

**15 files / 74 tests 全绿。** 详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- Fast：`UT-sop-fast-pipeline` 验证单次 speaker 调用即 done
- Strict：`UT-sop-pipeline` 在 `AXECODER_SOP_STRICT=1` 下回归完整流水线
- 回归：collab-workshop、chat-mode-lock

---

## 8. 代码审查

结论：**通过**。见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/sop/sop-fast-pipeline.ts` | 新增 | Fast 单 session 入口 |
| `electron/main/sop/sop-mode.ts` | 新增 | strict 开关 |
| `electron/main/sop/sop-pipeline-engine.ts` | 修改 | 分发 + 导出 follow-up |
| `electron/main/agent/agent-loop.ts` | 修改 | sopFast |
| `tests/unittest/UT-sop-fast-pipeline/` | 新增 | Fast 单测 |

---

## 10. 遗留项与后续建议

- WorkshopSopProgress 可按 artifact checkpoint 细化（非阻塞）
- 手工在 IDE 选 Software Co. 验证真实 LLM 单 session 体验

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-software-co-single-session.md` |
| 计划 | `_artifacts/plan-software-co-single-session.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 审查 | `_artifacts/06-code-review.md` |
