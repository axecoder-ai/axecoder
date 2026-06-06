# 调研链接

| 文档 | 说明 |
|------|------|
| `docs/research/research-ide-basics.md` | IDE 基础能力缺口，§4 P0 含「项目内搜索」 |
| `docs/proposals/proposal-ide-basics.md` | 搜索面板 + ripgrep IPC 的既有提案 |
| `electron/main/fs-ipc.ts` | `fs:search` + `runRipgrep` 已实现 |
| `electron/main/rg-files.ts` | `runRipgrepFiles` 文件列表 |
| `src/components/workbench/SearchPanel.vue` | 侧栏搜索 UI（需手动点 Search） |
| `src/components/workbench/TitleBar.vue` | 顶栏误用搜索图标展示项目名 |
| `src/App.vue` | `onFindInFiles` / `onSearch` 编排 |

**调研缺口：** 无独立 `research-global-search.md`；本轮基于上述源码静态分析 + 对话中 VS Code 对标结论。
