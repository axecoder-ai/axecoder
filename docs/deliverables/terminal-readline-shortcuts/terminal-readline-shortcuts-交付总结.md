# terminal-readline-shortcuts 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | terminal-readline-shortcuts |
| 完成日期 | 2026-06-23 |
| 选定方案 | 提案 1 – 终端聚焦时禁用菜单快捷键 + xterm 按键透传 |
| 审查结论 | 通过 |
| 单测 | 全绿（733/733） |

---

## 1. 概述

**需求：** AxeCoder 嵌入式终端聚焦时应支持 shell 原生 readline（尤其 Ctrl+R reverse-i-search），且 Ctrl+R 不刷新页面；失焦后保持现有全局快捷键。

**本轮目标：** 以最小改动让快捷键到达 PTY/shell，不做自定义历史 UI。

**选型：** 推荐并采用提案 1（`setIgnoreMenuShortcuts` + 聚焦 IPC）。

**交付物目录：** `docs/deliverables/terminal-readline-shortcuts/`，过程稿见 `_artifacts/`。

---

## 2. 方案

终端 xterm 聚焦时 IPC 通知主进程 `webContents.setIgnoreMenuShortcuts(true)`；失焦恢复 `false`。前端 `onFocus`/`onBlur` 上报，`attachCustomKeyEventHandler` 配合 xterm 处理控制键。历史由 shell readline 管理。

**影响范围：** `TerminalView.vue`、`terminal-ipc.ts`、preload、types、`shared/terminal-readline-keys.ts`。

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 思路 | 聚焦时禁用全部菜单快捷键 | before-input-event 按键表拦截 |
| 工作量 | 小 | 中 |
| 风险 | 聚焦时 Save/Reload 暂不可用 | 键表易遗漏 |

**用户选择：** 提案 1，无额外调整。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

1. 共享工具与单测 → 2. 主进程 IPC → 3. TerminalView 集成。全文见 `_artifacts/plan-terminal-readline-shortcuts.md`。

---

## 5. 实现说明

- `terminal:setFocused` → `applyTerminalFocusShortcuts` → `setIgnoreMenuShortcuts`
- `TerminalView`：`onFocus`/`onBlur`/`active`/`unmount` 生命周期清理
- 新增 7 项单测

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

```bash
npm test -- tests/unittest/UT-terminal-readline-shortcuts/terminal-readline-keys.test.ts
npm test
```

专项 7/7 通过；全量 154 文件、733 用例全绿。详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

| 类型 | 结果 |
|------|------|
| 单测 | 全绿 |
| 手工 | 待用户在 dev 环境验证 Ctrl+R reverse-i-search、失焦后 Reload |

---

## 8. 代码审查

**结论：通过。** 无阻塞项；建议真机验证 macOS Cmd+R / Windows Ctrl+R。详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `shared/terminal-readline-keys.ts` | 新增 | 聚焦快捷键与按键策略 |
| `electron/main/terminal-ipc.ts` | 修改 | terminal:setFocused IPC |
| `electron/preload/index.ts` | 修改 | terminalSetFocused API |
| `src/types/axecoder.d.ts` | 修改 | 类型 |
| `src/components/workbench/TerminalView.vue` | 修改 | 聚焦上报与按键处理 |
| `tests/unittest/UT-terminal-readline-shortcuts/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

- 手工验收终端内 Ctrl+R、Ctrl+A/E/K/U
- Windows cmd.exe readline 弱于 zsh，不额外适配
- 多窗口场景各窗口聚焦状态独立（当前单窗口主流程已覆盖）

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型记录 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-terminal-readline-shortcuts.md` |
| 实施计划 | `_artifacts/plan-terminal-readline-shortcuts.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测报告 | `_artifacts/05-unittest.md` |
| 代码审查 | `_artifacts/06-code-review.md` |
