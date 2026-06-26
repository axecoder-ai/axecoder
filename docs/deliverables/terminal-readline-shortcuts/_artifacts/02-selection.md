# 方案选型记录

## 2a 选型摘要

**需求回顾：** 终端聚焦时 Ctrl+R 等 readline 快捷键交给系统默认 shell（含 reverse-i-search），且 Ctrl+R 不刷新页面；失焦后保持现有全局快捷键。不做自定义历史 UI。

| 维度 | 提案 1 聚焦时禁用菜单快捷键 | 提案 2 before-input-event 选择性拦截 |
|------|---------------------------|--------------------------------------|
| 核心思路 | 终端聚焦 → `setIgnoreMenuShortcuts(true)` | 仅对冲突键 `preventDefault` |
| 主要改动范围 | TerminalView、preload、主进程 focus | 同上 + before-input-event + 键表 |
| 优点 | 简单、VS Code 同类、readline 全覆盖 | 非终端菜单行为零影响 |
| 缺点 / 风险 | 聚焦时全局 Save/Reload 暂不可用 | 键表易遗漏、跨平台验证多 |
| 工作量 | 小 | 中 |

**推荐：** 提案 1

## 2b 用户最终选择

- **选定提案：** 提案 1 – 终端聚焦时禁用菜单快捷键 + xterm 按键透传
- **调整说明：** 无额外调整
