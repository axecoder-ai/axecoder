# 功能实现报告

## 功能说明

终端聚焦时通过 IPC 通知主进程 `webContents.setIgnoreMenuShortcuts(true)`，避免 Electron 菜单（Reload、Save、Find 等）抢占 Ctrl/Cmd 组合键，使按键经 xterm → PTY 到达 shell readline（含 Ctrl+R reverse-i-search）。失焦、面板隐藏或组件卸载时恢复菜单快捷键。

## 修改文件列表

| 文件 | 变更 |
|------|------|
| `shared/terminal-readline-keys.ts` | 新增：`applyTerminalFocusShortcuts`、`terminalCustomKeyHandlerAllowsXterm` |
| `electron/main/terminal-ipc.ts` | `terminal:setFocused` IPC，聚焦状态与菜单快捷键同步 |
| `electron/preload/index.ts` | 暴露 `terminalSetFocused` |
| `src/types/axecoder.d.ts` | 类型声明 |
| `src/components/workbench/TerminalView.vue` | onFocus/onBlur IPC、自定义按键处理、清理 |
| `tests/unittest/UT-terminal-readline-shortcuts/terminal-readline-keys.test.ts` | 新增单测 |

## 单测覆盖

- `terminalCustomKeyHandlerAllowsXterm`：Ctrl+R/A/E/S、Cmd+R、keyup
- `applyTerminalFocusShortcuts`：聚焦/失焦/空 webContents

## 注意事项

- 终端聚焦时全局菜单快捷键（Save、Reload 等）暂不可用，符合需求。
- Windows cmd.exe readline 能力弱于 zsh/bash，以与同 shell 原生终端一致为准。
- 手工验收：打开终端 → 执行数条命令 → Ctrl+R 搜索历史；点击编辑器后 Ctrl+R/Cmd+R 可刷新。
