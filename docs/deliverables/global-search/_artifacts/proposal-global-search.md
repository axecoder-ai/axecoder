# 已确认解决方案提案：全局搜索（完整 VS Code 搜索视图）

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 实现可用的全局搜索——项目内文本搜索，体验对齐 VS Code Search 视图。
- **调研来源：** `docs/deliverables/global-search/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-global-search.md`（双方案草稿）
- **选定基础：** 提案 2 – 完整 VS Code 搜索视图
- **用户调整摘要：** 无额外调整，按方案原文落地

---

### 最终方案 – 完整 VS Code 搜索视图

- **概述：** 顶栏改为项目切换语义（去除搜索误导）；侧栏 `SearchPanel` 升级为 VS Code Search 视图：输入即搜（debounce）、大小写/全词/正则 toggle、包含/排除 glob、可折叠替换区；新增 `QuickOpenPalette`（⌘P）；`⌘⇧F` 聚焦侧栏并预填编辑器选中文本。后端扩展 `fs:search` 接收选项对象，新增 `fs:searchReplace` 与 `fs:listProjectFiles`（Quick Open 用）。
- **相对选定提案的变更：** 无（用户未调整）
- **关键变更：**
  - `electron/main/fs-ipc.ts`：`runRipgrep` 扩展参数；`fs:searchReplace`；`fs:listProjectFiles`
  - `electron/preload/index.ts`、`src/types/axecoder.d.ts`：类型与桥接
  - `src/components/workbench/SearchPanel.vue`：选项条、glob、replace、debounce
  - `src/components/workbench/QuickOpenPalette.vue`（新）
  - `src/components/workbench/TitleBar.vue`：文件夹图标 + 项目文案
  - `src/App.vue`、`useWorkbench.ts`、`electron/main/index.ts`：快捷键与编排
  - `shared/i18n/locales/en.ts`、`zh-CN.ts`
- **权衡：**
  - **收益：** 完整对标 VS Code 侧栏搜索 + Quick Open，一次到位。
  - **风险：** 替换写盘需确认对话框；debounce 并发用 requestId 忽略旧结果；大项目 listFiles 需限流/缓存。
- **验证：**
  - 手工：选项切换结果正确；include `*.ts` 过滤；replace 确认后落盘；⌘P/⌘⇧F 快捷键。
  - 单测：`runRipgrep` 参数矩阵；replace 逻辑；fuzzy 排序。
- **待解决问题：**
  - replace 是否后续加 dry-run 预览面板（本期用确认对话框）。
  - Quick Open 文件列表缓存策略（本期：每次打开拉取，上限 5000 路径）。

### 未采纳方案说明

- **未选：** 提案 1 – VS Code 轻量对齐
- **原因：** 用户选型时明确选择提案 2 完整搜索视图。
