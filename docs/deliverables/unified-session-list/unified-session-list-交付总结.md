# unified-session-list — 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | unified-session-list |
| 完成日期 | 2026-06-02 |
| 选定方案 | 提案 1 — 统一 Session 注册表 |
| 审查结论 | 通过 |
| 单测 | 全绿（213/213） |

---

## 1. 概述

将 Collab Workshop 与 Chat Agents 的会话列表合并到右侧 **Agents 侧栏**统一管理；`.axecoder/sessions/index.json` 为唯一索引，用 `kind` 区分 `agent` / `workshop`。交付目录：`docs/deliverables/unified-session-list/`。

---

## 2. 方案

- 单 index + `kind`；Agent 正文 `sessions/{id}.json`，Workshop 正文 `workshops/{id}.json`
- 自动迁移旧 `workshops/index.json`
- `WorkshopPane` 不再自带左侧列表
- 协作占中央时右侧 Agents 统一列表仍可见，可在对话/协作间切换

详见 `_artifacts/proposal-unified-session-list.md`。

---

## 3. 方案选型过程

推荐提案 1；用户选定提案 1，无额外调整。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

阶段：registry → store 适配 → IPC/UI → 单测。详见 `_artifacts/plan-unified-session-list.md`。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

- 命令：`npm test`（vitest run）
- 结果：**49 文件、213 用例全部通过**
- 完整输出：`_artifacts/05-unittest.md`

---

## 7. 测试报告

- 自动化：见上节
- 手工建议：打开项目 → Agents 侧栏见对话+协作 → 切换类型 → 新建两种会话 → 删除

---

## 8. 代码审查

结论：**通过**。见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/session/*` | 新增 | 注册表与 IPC |
| `electron/main/chat-store.ts` | 修改 | 统一 index |
| `electron/main/workshop/workshop-store.ts` | 修改 | 统一 index |
| `AgentsPanel.vue` / `WorkshopPane.vue` / `App.vue` | 修改 | 合并列表 UI |
| `preload` / `axecoder.d.ts` | 修改 | `listAllSessions` |
| `UT-unified-session-list/*` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

- 编辑器标签打开时的协作入口 UX
- 消息体 union、清理废弃 `workshops/index.json`

---

## 11. 附录：过程文档索引

| 文件 |
|------|
| `_artifacts/00-research-links.md` |
| `_artifacts/02-selection.md` |
| `_artifacts/proposal-unified-session-list.md` |
| `_artifacts/plan-unified-session-list.md` |
| `_artifacts/05-implement-report.md` |
| `_artifacts/05-unittest.md` |
| `_artifacts/06-code-review.md` |
