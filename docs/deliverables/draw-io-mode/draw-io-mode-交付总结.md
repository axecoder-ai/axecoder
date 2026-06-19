# draw-io-mode 交付总结

| 项 | 值 |
|---|---|
| 任务名 | draw-io-mode |
| 完成日期 | 2026-06-19 |
| 选定方案 | Workshop 嵌入 + 内置图表工具（去 MCP） |
| 审查结论 | 通过 |
| 单测 | 全绿（21/21） |

---

## 1. 概述

将 next-ai-draw-io 的 AI 画图能力接入 AxeCoder，新增 **Draw.IO** 模式（Plan 与 Multi-Agent 之间）。用户选定提案 2，并要求：**拷贝代码、不用 MCP、不启外部服务**。最终实现为 Workshop 嵌入 + 内置 `DisplayDiagram` / `EditDiagram` / `GetDiagram` 工具 + 应用内 draw.io iframe。

交付目录：`docs/deliverables/draw-io-mode/_artifacts/`

---

## 2. 方案

见 `_artifacts/proposal-draw-io-mode.md`（状态：已确认）。

要点：移植 XML 操作与 embed 协议；Workshop 会话存 `diagramXml`；`orchestrationChatMode === 'draw-io'` 时走 `sendDrawIoWorkshopMessage`。

---

## 3. 方案选型过程

见 `_artifacts/02-selection.md`。

- 推荐：提案 1（MCP 分栏）
- **用户选定**：提案 2 + 调整（无 MCP、无外部服务、代码拷贝）

---

## 4. 实施计划

见 `_artifacts/plan-draw-io-mode.md`（四阶段：模式 → Main 引擎 → IPC/UI → 测试）。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

见 `_artifacts/05-unittest.md`。**全绿** 21/21。

---

## 7. 测试报告

- 自动化：UT-draw-io-mode、UT-chat-modes-ui、UT-chat-mode-lock 通过
- 手工：待用户在 Draw.IO 模式下输入自然语言验证画布更新

---

## 8. 代码审查

见 `_artifacts/06-code-review.md`。**通过**，无阻塞项。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/draw-io/` | 新增 | 图表引擎与 Agent 回合 |
| `electron/main/draw-io-ipc.ts` | 新增 | IPC |
| `electron/main/agent/*` | 修改 | 工具、chat-mode |
| `electron/main/workshop-*` | 修改 | diagramXml、发送分支 |
| `src/utils/chat-modes.ts` | 修改 | draw-io 模式 |
| `src/components/workbench/DrawIoEmbed.vue` | 新增 | 画布 |
| `src/components/workbench/WorkshopChatSection.vue` | 修改 | 分栏 |
| `src/components/workbench/ChatPane.vue` | 修改 | 嵌入 |
| `tests/unittest/UT-draw-io-mode/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

1. 离线自建 draw.io（环境变量 `DRAWIO_BASE_URL`）
2. shape library 文档工具、VLM 图表校验
3. Software Co. MetaGPT 对齐为独立任务（非本 slug）

---

## 11. 附录：过程文档索引

| 文件 |
|------|
| `_artifacts/00-research-links.md` |
| `_artifacts/02-selection.md` |
| `_artifacts/proposal-draw-io-mode.md` |
| `_artifacts/plan-draw-io-mode.md` |
| `_artifacts/05-implement-report.md` |
| `_artifacts/05-unittest.md` |
| `_artifacts/06-code-review.md` |
