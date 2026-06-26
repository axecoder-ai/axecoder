# 调研材料索引

| 路径 | 说明 |
|------|------|
| `docs/requirements/terminal-readline-shortcuts.md` | 需求澄清文档（背景、功能/非功能要求、范围外） |
| `src/components/workbench/TerminalView.vue` | xterm.js 终端组件，当前仅 `onData` 转发输入 |
| `electron/main/terminal-ipc.ts` | node-pty 会话管理 |
| `electron/main/index.ts` | 应用菜单含 `{ role: 'reload' }`（占用 Cmd/Ctrl+R） |
| `src/components/workbench/BottomPanel.vue` | 终端面板挂载与 `active` 状态 |

**调研缺口：** 无独立 `/research-codebase` 产出；以上代码浏览 + 需求文档作为调研依据。
