# session-auto-title — 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | session-auto-title |
| 完成日期 | 2026-06-02 |
| 选定方案 | 提案 3 — 首句占位 + 多轮后 LLM 刷新 |
| 审查结论 | 通过 |
| 单测 | 全绿（257/257） |

---

## 1. 概述

**需求：** Agents 侧栏会话名应反映对话**主题**，而非长期停留在「你好」等首句截断。

**目标：** 首条快速占位；约两轮对话后，用 fast 模型生成 6–16 字中文主题并更新 registry。

**选型：** 推荐提案 1；用户选定提案 3（混合），并明确本期不做手动重命名 UI。

**交付目录：** `docs/deliverables/session-auto-title/`

---

## 2. 方案

- 占位：`New Agent` / `新对话` / 与首条 user 相同 / 短问候
- 触发：`messages.length >= 4`（user+assistant 各至少 2 条）且仍为占位
- Main：`session:suggestTitle` → `chatWithProvider`（fast API）
- Renderer：`persist` 后异步刷新，成功则写回 title

详见 `_artifacts/proposal-session-auto-title.md`。

---

## 3. 方案选型过程

见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

阶段：session-title 模块 → IPC → ChatPane 挂钩 → 单测。详见 `_artifacts/plan-session-auto-title.md`。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

- 命令：`npm test`
- 结果：**57 文件、257 用例全部通过**
- 详见 `_artifacts/05-unittest.md`

---

## 7. 测试报告

- 自动化：全绿
- 手工建议：新建对话 → 发「你好」→ 再两轮深入讨论（如模块优先级）→ 侧栏 title 应从「你好」变为主题短语

---

## 8. 代码审查

结论：**通过**。见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/session/session-title.ts` | 新增 | 标题生成逻辑 |
| `electron/main/session/session-ipc.ts` | 修改 | IPC |
| `electron/preload/index.ts` | 修改 | 暴露 API |
| `src/types/axecoder.d.ts` | 修改 | 类型 |
| `src/components/workbench/ChatPane.vue` | 修改 | 触发刷新 |
| `tests/unittest/UT-session-auto-title/*` | 新增 | 单测 |
| `tests/unittest/UT-agent-bulk/agent-bulk.test.ts` | 修改 | mock modelId |

---

## 10. 遗留项与后续建议

- Workshop 会话自动标题
- 用户手动重命名
- 可选 debounce 减少连续 persist 时的重复请求

---

## 11. 附录：过程文档索引

| 文件 | 说明 |
|------|------|
| `_artifacts/00-research-links.md` | 调研链接 |
| `_artifacts/02-selection.md` | 选型记录 |
| `_artifacts/proposal-session-auto-title.md` | 已确认方案 |
| `_artifacts/plan-session-auto-title.md` | 实施计划 |
| `_artifacts/05-implement-report.md` | 实现报告 |
| `_artifacts/05-unittest.md` | 单测记录 |
| `_artifacts/06-code-review.md` | 审查 |
