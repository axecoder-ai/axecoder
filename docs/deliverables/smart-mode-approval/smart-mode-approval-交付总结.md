---
任务名: smart-mode-approval
完成日期: 2026-06-30
选定方案: 提案 1 – LLM Auto-review 分类器 + 智能审批卡
审查结论: 通过
单测全绿: 是
---

# 智能审批（Smart Mode Approval）交付总结

## 1. 概述

对齐 Cursor Smart Mode：高风险工具执行前 Auto-review，拦截后 Agent 可请求用户智能审批。设置 **智能审批（Smart Mode）** 开关默认开启，关闭后与旧版一致。

- **选型：** 提案 1（LLM 分类器）
- **交付目录：** `docs/deliverables/smart-mode-approval/`

---

## 2. 方案

已确认：LLM `allow|block` 分类器 + `ChatSmartApprovalCard` + `agentSmartModeApproval`（默认 true）。

审查范围：Bash（非只读）、WebFetch、CallMcpTool、WebRun、Delete。

---

## 3. 方案选型过程

见 `_artifacts/02-selection.md`。用户选定提案 1，无额外调整。

---

## 4. 实施计划

见 `_artifacts/plan-smart-mode-approval.md`。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。

核心路径：`agent-loop` 在 `executeAgentTool` 前调用 `runSmartReview`；`requestSmartModeApproval` 进入 `pendingSmartById`；`agent:confirmSmartApproval` 续跑。

---

## 6. 单元测试执行情况

- 专项：5 passed
- 全量：**812 passed**，全绿

见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 单测：通过
- 手工：建议用 `rm -rf` 类命令验证 block → 审批卡 → Approve 续跑；关闭开关后应无 Auto-review

---

## 8. 代码审查

**通过**。见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-smart-review-*.ts` | 新增 | 门控与分类器 |
| `electron/main/agent/agent-loop.ts` | 修改 | 主循环与 IPC 续跑 |
| `src/components/workbench/ChatSmartApprovalCard.vue` | 新增 | 审批 UI |
| `GeneralTab.vue` / `config-store.ts` | 修改 | 开关默认开 |

---

## 10. 遗留项

- 子 Agent 内循环未接入 Smart Mode
- 可增加 mock 分类器的 loop 集成测

---

## 11. 附录：过程文档索引

| 文件 |
|------|
| `_artifacts/02-selection.md` |
| `_artifacts/proposal-smart-mode-approval.md` |
| `_artifacts/plan-smart-mode-approval.md` |
| `_artifacts/05-implement-report.md` |
| `_artifacts/05-unittest.md` |
| `_artifacts/06-code-review.md` |
