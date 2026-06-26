# design-slash-command 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | design-slash-command |
| 完成日期 | 2026-06-27 |
| 选定方案 | 提案 1 – Main IPC 集中 + builtin 注册 |
| 审查结论 | 通过 |
| 单测 | 全绿（747/747） |

---

## 1. 概述

**需求：** 新增 `/design` 斜杠命令管理项目 `DESIGN.md`，并在存在时约束 Agent 前端样式。

**本轮目标：** 列内置主题、复制设计规范、展示配色、动态注入 Agent 规则。

**选型：** 推荐并采用提案 1（Main IPC + system prompt 注入）。

**交付物目录：** `docs/deliverables/design-slash-command/`（过程稿见 `_artifacts/`）。

---

## 2. 方案

项目根 `DESIGN.md` 存在时 `/design` 展示配色并提示可删除；否则无参列 `APP_ROOT/design/` 主题，有参复制 `design/<theme>/DESIGN.md`。Agent 通过 `buildDesignMdAgentRule` 注入前端遵循 DESIGN.md 的规则。

**影响范围：** Main `design-slash.ts`、agent-ipc、builtin `/design`、system-prompt。

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 核心 | Main IPC + prompt 注入 | Renderer + 落盘 rules |
| Agent 约束 | 可靠 | 非 alwaysApply 易失效 |

**用户选择：** 提案 1，无额外调整。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

1. `design-slash.ts` + 单测  
2. IPC + builtin 注册  
3. system prompt 注入 + 全量测试  

全文见 `_artifacts/plan-design-slash-command.md`。

---

## 5. 实现说明

- `/design` → `window.axecoder.agentDesignSlash`
- 配色从 YAML `colors:` 解析
- 主题名安全校验、大小写不敏感

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

`npm test -- --run`：**155 文件 / 747 用例全通过**。详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 单测覆盖 list / copy / show / agent rule 四分支
- 手工验收建议：无 DESIGN 项目执行 `/design`、`/design cursor`；有 DESIGN 项目执行 `/design` 查看配色

---

## 8. 代码审查

结论：**通过**。详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/design/design-slash.ts` | 新增 | 核心逻辑 |
| `electron/main/agent-ipc.ts` | 修改 | IPC |
| `electron/preload/index.ts` | 修改 | preload API |
| `src/types/axecoder.d.ts` | 修改 | 类型 |
| `src/slash-commands/builtin.ts` | 修改 | `/design` 命令 |
| `electron/main/agent/agent-system-prompt.ts` | 修改 | 设计规范注入 |
| `tests/unittest/UT-design-slash/design-slash.test.ts` | 新增 | 单测 |
| `tests/unittest/UT-slash-commands/registry.test.ts` | 修改 | 注册断言 |

---

## 10. 遗留项与后续建议

- 未做 Cursor IDE 全局 `.cursor/commands/design.md`（用户未要求）
- 可选：聊天区 `/help` 补充 `/design` 说明

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 选型记录 | `_artifacts/02-selection.md` |
| 双方案/已确认方案 | `_artifacts/proposal-design-slash-command.md` |
| 实施计划 | `_artifacts/plan-design-slash-command.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测记录 | `_artifacts/05-unittest.md` |
| 代码审查 | `_artifacts/06-code-review.md` |
