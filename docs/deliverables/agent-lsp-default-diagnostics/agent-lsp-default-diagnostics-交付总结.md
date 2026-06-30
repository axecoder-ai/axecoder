# Agent LSP 默认开启 + 编辑后自动诊断 — 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | agent-lsp-default-diagnostics |
| 完成日期 | 2026-06-30 |
| 选定方案 | 提案 2 – 默认开启 + 同步 + 编辑工具自动附带诊断摘要 |
| 审查结论 | 通过 |
| 单测 | 全绿（21/21） |

---

## 1. 概述

**需求：** 编辑器 LSP 已有，Agent 链未默认接通；需在 Agent 写盘后同步 LSP 并自动附带诊断。

**本轮目标：** `agentFeatureLsp` 默认开；Write/Edit/ApplyPatch 后 sync + 自动 error/warning 诊断块。

**选型：** 推荐并选定提案 2；无额外调整。

**交付物目录：** `docs/deliverables/agent-lsp-default-diagnostics/_artifacts/`

---

## 2. 方案

- `agentFeatureLsp`、`agentLspAutoDiagnostics` 默认 `true`
- `lsp-agent-sync`：写盘 → `didOpen`/`didChange`
- `agent-lsp-post-edit`：工具回报附 `--- LSP diagnostics ---`
- Worker 经 `afterAgentFileWrite` 委托主进程
- 会话 `startAgentTurn` 预热 LSP

详见 `_artifacts/proposal-agent-lsp-default-diagnostics.md`。

---

## 3. 方案选型过程

用户选定提案 2，无调整。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

阶段一：配置 + sync；阶段二：post-edit + tool-executor；阶段三：预热 + 单测。

详见 `_artifacts/plan-agent-lsp-default-diagnostics.md`。

---

## 5. 实现说明

核心文件：`lsp-agent-sync.ts`、`agent-lsp-post-edit.ts`、`tool-executor.ts`、`config-store.ts`。

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

```bash
npm test -- tests/unittest/UT-agent-lsp-post-edit tests/unittest/UT-read-lints-tool tests/unittest/UT-agent-lsp tests/unittest/UT-fix-lints-tool
```

**21/21 通过，全绿。** 详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 单测覆盖 sync 分支、诊断过滤、配置门禁
- 集成/E2E：待补充（需本机 language server）

---

## 8. 代码审查

结论：**通过**。非阻塞：设置页 UI、慢 server 超时。

详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/lsp/lsp-agent-sync.ts` | 新增 | Agent 写盘 LSP 同步 |
| `electron/main/agent/agent-lsp-post-edit.ts` | 新增 | 诊断块拼装 |
| `electron/main/config-store.ts` | 修改 | 默认 true + 新配置项 |
| `electron/main/models-types.ts` | 修改 | `agentLspAutoDiagnostics` |
| `electron/main/agent/tool-executor.ts` | 修改 | finishAgentFileWrites |
| `electron/main/agent/agent-loop.ts` | 修改 | 会话 LSP 预热 |
| `electron/main/agent-worker/*` | 修改 | host 回传 result |
| `tests/unittest/UT-agent-lsp-post-edit/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

1. 设置页增加 LSP 相关 toggle
2. 已有 `config.json` 用户需手动设 `agentFeatureLsp: true` 或删键以用新默认

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-agent-lsp-default-diagnostics.md` |
| 计划 | `_artifacts/plan-agent-lsp-default-diagnostics.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 审查 | `_artifacts/06-code-review.md` |
