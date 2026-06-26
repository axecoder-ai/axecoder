# 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 终端聚焦时支持 shell 原生 readline（Ctrl+R reverse-i-search 等），Ctrl+R 不刷新页面；macOS / Windows / Linux。
- **调研来源：** `docs/requirements/terminal-readline-shortcuts.md`；`TerminalView.vue`；`electron/main/index.ts`；`terminal-ipc.ts`
- **上游提案：** `docs/proposals/proposal-terminal-readline-shortcuts.md`
- **选定基础：** 提案 1 – 终端聚焦时禁用菜单快捷键 + xterm 按键透传
- **用户调整摘要：** 无额外调整

---

### 最终方案 – 终端聚焦时禁用菜单快捷键 + xterm 按键透传

- **概述：** 终端 xterm 聚焦时经 IPC 通知主进程，对该窗口 `webContents.setIgnoreMenuShortcuts(true)`，避免 Electron 菜单（含 Reload 的 Cmd/Ctrl+R、Save 的 Ctrl+S 等）拦截按键；失焦或面板关闭时恢复 `false`。前端用 xterm `attachCustomKeyEventHandler` 将 Ctrl 组合键交给 xterm/PTY，由系统默认 shell 的 readline 处理历史搜索与行编辑。
- **相对选定提案的变更：** 无（按原提案落地）。
- **关键变更：**
  - `electron/main/terminal-ipc.ts`：`terminal:setFocused` IPC，调用 `setIgnoreMenuShortcuts`
  - `electron/preload/index.ts`、`src/types/axecoder.d.ts`：暴露 `terminalSetFocused`
  - `src/components/workbench/TerminalView.vue`：`onFocus`/`onBlur` 上报；`attachCustomKeyEventHandler`
  - `shared/terminal-readline-keys.ts`：按键透传判定（单测）
- **权衡：**
  - 收益：改动小、与 VS Code 类 IDE 一致、shell 原生行为
  - 风险：终端聚焦时全局菜单快捷键暂不可用（符合需求）
- **验证：**
  - 单测 `shouldPassthroughTerminalKey`
  - 手工：Ctrl+R reverse-i-search；Ctrl+A/E/K/U；失焦后 Reload 恢复
- **待解决问题：** Windows cmd.exe readline 能力有限，以「与同 shell 原生终端一致」验收。

### 未采纳方案说明

- **未选：** before-input-event 选择性拦截冲突键
- **原因：** 维护键表成本高、易遗漏；用户选定提案 1。
