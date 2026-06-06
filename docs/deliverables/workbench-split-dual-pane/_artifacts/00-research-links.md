# 调研链接

- `src/App.vue` — 工作台主布局：`primary-side`（资源管理器/搜索）+ `EditorPane` + `ai-side-panel`（`ChatPane` + `AgentsPanel`），已有列宽拖拽与 `clampLayoutWidths`
- `src/components/workbench/TitleBar.vue` — 侧栏/AI 面板切换按钮，可扩展分屏入口
- `src/utils/agents-panel.ts` — `WC_*_MIN` 列宽常量
- `electron/main/index.ts:343-357` — 已有 `open-win` IPC 可开子窗口（`hash` 路由），尚未暴露 preload
- 调研缺口：无专门「双屏工作台」设计文档；`open-win` 子窗口未与业务状态同步
