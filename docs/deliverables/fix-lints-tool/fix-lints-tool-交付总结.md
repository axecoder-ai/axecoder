# FixLints 工具 交付总结

| 字段 | 内容 |
|------|------|
| **任务名** | fix-lints-tool |
| **完成日期** | 2025-06-10 |
| **选定方案** | 提案 1 – LSP codeAction 自动应用 |
| **审查结论** | 通过 |
| **单测（本轮）** | 4/4 全绿 |

---

## 1. 概述

**FixLints** = ReadLints 的自动修：拉诊断 → LSP codeAction → 写盘 → 再读诊断验证。

**选型：** 提案 1，无额外调整。

---

## 2. 方案

- `FixLints({ paths?: string[] })`
- `textDocument/codeAction` + `WorkspaceEdit`
- `agentFeatureLsp`；Plan 模式禁止

详见 `_artifacts/proposal-fix-lints-tool.md`

---

## 3. 选型

`_artifacts/02-selection.md`

---

## 4. 实施计划

`_artifacts/plan-fix-lints-tool.md`

---

## 5. 实现说明

`_artifacts/05-implement-report.md`

---

## 6. 单测

本轮 4/4 全绿；全量 607/608。`_artifacts/05-unittest.md`

---

## 7. 测试报告

| 场景 | 结果 |
|------|------|
| applyTextEdits | ✅ |
| codeAction 集成 | ✅ |
| plan 模式拒绝 | ✅ |
| 真实 tsserver | 待手工 |

---

## 8. 代码审查

通过。`_artifacts/06-code-review.md`

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `agent-fix-lints.ts` | 新增 | 核心 |
| `lsp-workspace-edit.ts` | 新增 | TextEdit 应用 |
| `agent-read-lints.ts` | 修改 | 共享诊断 API |
| `agent-types.ts` 等 | 修改 | 注册 |

---

## 10. 遗留项

- CLI lint --fix 兜底
- command-only codeAction
- 矩阵文档同步

---

## 11. 附录

| 文件 | 路径 |
|------|------|
| 调研 | `_artifacts/00-research-links.md` |
| 选型 | `_artifacts/02-selection.md` |
| 方案 | `_artifacts/proposal-fix-lints-tool.md` |
| 计划 | `_artifacts/plan-fix-lints-tool.md` |
| 实现 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 审查 | `_artifacts/06-code-review.md` |
