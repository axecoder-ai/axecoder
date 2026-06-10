# ReadLints 工具 交付总结

| 字段 | 内容 |
|------|------|
| **任务名** | read-lints-tool |
| **完成日期** | 2025-06-10 |
| **选定方案** | 提案 1 – 独立 ReadLints 工具（Cursor 命名对齐） |
| **审查结论** | 通过 |
| **单测（本轮范围）** | 7/7 全绿 |

---

## 1. 概述

为 AxeCoder Agent 新增 **ReadLints** 工具，对齐 Cursor `READ_LINTS`，通过 LSP pull diagnostics 让模型在改码后读取类型/lint 诊断。

**选型：** 用户选定提案 1；无额外调整。

**交付物目录：** `docs/deliverables/read-lints-tool/_artifacts/`

---

## 2. 方案

- `ReadLints({ paths?: string[] })`
- LSP `textDocument/diagnostic`
- `agentFeatureLsp` 门禁；只读权限
- paths 省略时自动扫描 ≤30 源码文件

详见 `_artifacts/proposal-read-lints-tool.md`

---

## 3. 方案选型过程

用户选定提案 1。对比摘要见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

核心模块 → 工具注册 → 单测。详见 `_artifacts/plan-read-lints-tool.md`。

---

## 5. 实现说明

| 模块 | 说明 |
|------|------|
| `agent-read-lints.ts` | 解析、LSP 调用 |
| `lsp-formatters.ts` | 诊断格式化 |
| `agent-ext-executor.ts` | 执行入口 |

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

本轮 **7/7 全绿**；全量 603/604（1 个既有 bash-integration 失败）。见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

| 场景 | 结果 |
|------|------|
| paths 数组解析 | ✅ |
| 单 path 解析 | ✅ |
| 诊断格式化 | ✅ |
| mock LSP 执行 | ✅ |
| 无 LSP 配置项目 | 待手工验证 |
| 真实 gopls/tsserver 项目 | 待手工验证 |

---

## 8. 代码审查

**结论：通过**。无阻塞项。见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-read-lints.ts` | 新增 | ReadLints 核心 |
| `electron/main/agent/agent-types.ts` | 修改 | 工具名 |
| `electron/main/lsp/lsp-formatters.ts` | 修改 | formatDiagnosticsResult |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 修改 | schema |
| `electron/main/agent/agent-ext-executor.ts` | 修改 | 执行 |
| `electron/main/agent/agent-permissions.ts` | 修改 | 只读集 |
| `tests/unittest/UT-read-lints-tool/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

1. 无 LSP 时 tsc/eslint CLI 兜底
2. Renderer problems 面板 IPC 联动
3. 同步更新 `research-agent-tools-matrix.md` AxeCoder 列

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型记录 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-read-lints-tool.md` |
| 实施计划 | `_artifacts/plan-read-lints-tool.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测报告 | `_artifacts/05-unittest.md` |
| 代码审查 | `_artifacts/06-code-review.md` |
