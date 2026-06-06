# workbench-split-dual-pane 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | workbench-split-dual-pane |
| 完成日期 | 2026-06-06 |
| 选定方案 | 提案 2 – 双 BrowserWindow |
| 审查结论 | 通过 |
| 单测 | 全绿（420/420） |

---

## 1. 概述

**需求：** 一键将工作台分为代码区（资源管理器 + 编辑器）与会话区（会话列表 + 聊天），便于跨物理屏幕工作。

**本轮目标：** 以两个独立 Electron 窗口交付，而非单窗口 CSS 分栏。

**选型：** 推荐提案 1（单窗口），用户最终选定**提案 2（双窗）**，调整说明为「就变成两个窗口了」。

**交付物目录：** `docs/deliverables/workbench-split-dual-pane/_artifacts/`

---

## 2. 方案

主窗口保留代码编辑布局；点击 TitleBar「双窗分屏」打开伴生窗（`#companion`），仅渲染会话列表与聊天。主窗在伴生窗打开时隐藏右侧 AI 列。Agent/Workshop 进度向所有渲染进程广播。

详见 `_artifacts/proposal-workbench-split-dual-pane.md`（**状态：已确认**）。

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 核心 | 单窗口左右大列 | 主窗 + 会话伴生窗 |
| 双屏 | 需拉宽单窗 | 可拖到副屏 |
| 工作量 | 中 | 大 |

**用户选择：** 提案 2。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

阶段：主进程伴生窗 → preload API → App/TitleBar 布局 → 单测。全文见 `_artifacts/plan-workbench-split-dual-pane.md`。

---

## 5. 实现说明

- IPC：`window:openCompanion` / `closeCompanion` / `getRole` / `companionState`
- UI：TitleBar 双列图标按钮；伴生窗精简标题栏
- 进度：`renderer-broadcast.ts` 统一 `webContents.send`

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

- 专项 3 例通过；全量 **96 文件 / 420 用例** 全绿
- 详见 `_artifacts/05-unittest.md`

---

## 7. 测试报告

- **自动化：** 全绿（见上）
- **手工（建议）：** 双显示器打开伴生窗；主窗 AI 列隐藏/恢复；会话切换；Agent 流式两窗可见

---

## 8. 代码审查

**通过**，无阻塞项。非阻塞：伴生窗设置入口、窗口几何记忆。详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/index.ts` | 修改 | 伴生窗与 IPC |
| `electron/main/renderer-broadcast.ts` | 新增 | 多窗广播 |
| `electron/main/agent/agent-progress-emit.ts` | 修改 | 广播进度 |
| `electron/main/workshop/workshop-progress-emit.ts` | 修改 | 广播进度 |
| `electron/preload/index.ts` | 修改 | 暴露 API |
| `src/App.vue` | 修改 | 布局分支 |
| `src/components/workbench/TitleBar.vue` | 修改 | 双窗按钮 |
| `src/utils/workbench-window-role.ts` | 新增 | 角色解析 |
| `shared/i18n/locales/*.ts` | 修改 | 文案 |
| `tests/unittest/UT-workbench-split-dual-pane/*` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

- 伴生窗内设置/命令面板快捷入口
- 持久化伴生窗位置与尺寸
- 菜单「Toggle Chat」在双窗模式下聚焦伴生窗

---

## 11. 附录：过程文档索引

| 文件 |
|------|
| `_artifacts/00-research-links.md` |
| `_artifacts/02-selection.md` |
| `_artifacts/proposal-workbench-split-dual-pane.md` |
| `_artifacts/plan-workbench-split-dual-pane.md` |
| `_artifacts/05-implement-report.md` |
| `_artifacts/05-unittest.md` |
| `_artifacts/06-code-review.md` |
