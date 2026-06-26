# 终端 Readline 快捷键支持 — 设计文档

## 当前背景

- AxeCoder 底部终端基于 `@xterm/xterm` + `node-pty`，输入经 `onData` → `terminal:write` 写入 shell。
- Electron 应用菜单含 `{ role: 'reload' }`（Cmd/Ctrl+R）及 Save/Find 等 accelerator，在终端聚焦时仍会抢占快捷键。
- 用户需要与原生终端一致的 readline（尤其 Ctrl+R reverse-i-search），不做自定义历史 UI。

## 需求

### 功能需求

- 终端聚焦：Ctrl+R/S/A/E/K/U/W/L 等 readline 快捷键到达 shell
- 终端聚焦：Ctrl+R 不触发页面刷新
- 终端失焦：恢复现有菜单快捷键行为
- 历史由 shell 管理，无额外 UI

### 非功能需求

- macOS / Windows / Linux；macOS 使用 Ctrl+R（非 Cmd+R）作 readline
- 不破坏现有终端 I/O、resize、主题

## 设计决策

### 1. 主进程：setIgnoreMenuShortcuts

终端聚焦时对当前 `BrowserWindow.webContents` 调用 `setIgnoreMenuShortcuts(true)`，失焦时 `false`。与 VS Code 集成终端做法一致，避免逐键维护冲突表。

### 2. 渲染进程：xterm 按键透传

`attachCustomKeyEventHandler` 对 Ctrl 组合键返回 `false`，阻止浏览器默认行为，让 xterm 写入 PTY。抽取 `shouldPassthroughTerminalKey` 便于单测。

### 3. 聚焦生命周期

- `term.onFocus` / `term.onBlur` 上报 IPC
- `active=false`、组件 `onUnmounted` 时强制 `terminalSetFocused(false)`

## 技术设计

### 集成点

```
TerminalView (focus/blur)
  → preload terminalSetFocused
  → ipc terminal:setFocused
  → webContents.setIgnoreMenuShortcuts(focused)
```

### 文件变更

| 文件 | 操作 |
|------|------|
| `shared/terminal-readline-keys.ts` | 新增 |
| `electron/main/terminal-ipc.ts` | 修改 |
| `electron/preload/index.ts` | 修改 |
| `src/types/axecoder.d.ts` | 修改 |
| `src/components/workbench/TerminalView.vue` | 修改 |
| `tests/unittest/UT-terminal-readline-shortcuts/terminal-readline-keys.test.ts` | 新增 |

## 实施计划

1. **阶段一：共享工具与单测**
   - 实现 `shouldPassthroughTerminalKey`
   - 编写 vitest 用例

2. **阶段二：主进程与 preload**
   - `terminal:setFocused` IPC + `setIgnoreMenuShortcuts`

3. **阶段三：TerminalView 集成**
   - focus/blur IPC
   - `attachCustomKeyEventHandler`
   - 失焦清理

## 测试策略

- 单测：按键透传纯函数
- 手工：终端内 Ctrl+R 搜索历史；失焦后菜单 Reload

## 发布考虑

- 无配置项；升级后即用
