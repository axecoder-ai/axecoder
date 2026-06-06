# 功能实现报告：全局搜索

## 功能说明

1. **顶栏语义修正**：文件夹图标 +「项目：{name}」，不再误导为搜索框。
2. **侧栏搜索视图（VS Code 对齐）**：
   - 输入即搜（300ms debounce）
   - 大小写 / 全词 / 正则 toggle
   - 包含/排除 glob
   - 可折叠替换区 + 全部替换（确认对话框）
3. **Quick Open（⌘P）**：模糊匹配项目文件并打开。
4. **⌘⇧F**：打开搜索侧栏，预填编辑器选中文本。

## 修改文件列表

| 文件 | 变更 |
|------|------|
| `electron/main/search-utils.ts` | 新增：ripgrep 参数、搜索、替换、列文件 |
| `electron/main/fs-ipc.ts` | 扩展 `fs:search`、新增 `fs:searchReplace`、`fs:listProjectFiles` |
| `electron/preload/index.ts` | 桥接新 IPC + `menu:quickOpen` |
| `electron/main/index.ts` | View 菜单 Quick Open ⌘P |
| `src/types/axecoder.d.ts` | `SearchOptions`、`SearchReplaceResult`、API 类型 |
| `src/components/workbench/SearchPanel.vue` | 完整搜索视图 UI |
| `src/components/workbench/QuickOpenPalette.vue` | 新增 |
| `src/components/workbench/TitleBar.vue` | 顶栏图标与文案 |
| `src/components/workbench/EditorPane.vue` | `getEditorSelection` |
| `src/App.vue` | 搜索/替换/Quick Open 编排 |
| `src/composables/useWorkbench.ts` | search/replace/listFiles |
| `src/utils/quick-open-fuzzy.ts` | 模糊匹配 |
| `shared/i18n/locales/en.ts`、`zh-CN.ts` | 文案 |
| `tests/unittest/UT-global-search/*.test.ts` | 单测 |

## 单测覆盖

- `buildRipgrepArgs` 参数组合
- `replaceInLine` / `countReplacementsInLine`
- `fuzzyScore` / `fuzzyFilterPaths`

## 注意事项

- 替换前 `window.confirm` 确认；替换后刷新文件树。
- 搜索并发通过 `searchGen` 忽略过期结果。
- Quick Open 文件列表上限 5000（与 `listProjectFiles` 一致）。
