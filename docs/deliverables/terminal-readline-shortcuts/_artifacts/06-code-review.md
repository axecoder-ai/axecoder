# 代码审查报告

## 审查范围

对照 `proposal-terminal-readline-shortcuts.md` 与 `plan-terminal-readline-shortcuts.md`，审查步骤 5 全部代码与测试变更。

## 功能

- [x] 终端聚焦时 `setIgnoreMenuShortcuts(true)`，解决菜单抢占 Ctrl+R 等键
- [x] 失焦/卸载/stop 时恢复 `false`
- [x] xterm onFocus/onBlur 与 active 状态联动
- [x] 无自定义历史 UI，历史由 shell 处理

## 质量

- [x] 逻辑集中在 `shared/terminal-readline-keys.ts`，主进程与单测复用
- [x] 改动面小，符合最小修改原则
- [x] 7 项单测 + 全量 733 测试通过

## 安全

- [x] 无新增外部输入面；IPC 仅布尔聚焦状态

## 非阻塞待办

- 建议在真机手工验证 macOS Cmd+R 与 Windows Ctrl+R
- `terminalCustomKeyHandlerAllowsXterm` 当前恒为 true，主要依赖 `setIgnoreMenuShortcuts`；若后续有个别键需交还 workbench，可在此扩展返回 false

## 结论

**通过** — 可合并交付。
