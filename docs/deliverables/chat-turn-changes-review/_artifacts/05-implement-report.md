# 功能实现报告

## 功能说明

1. **Review 修通**：`onReviewPatch` 通过 `buildDiffOpenFile` + `upsertOpenFile` 直接写入 `openFiles` 并激活标签，无需 `EditorPane` 已挂载。
2. **样式**：变更栏移入 `.input-box` 顶部，文件为 pill 芯片，Review 为 accent 主按钮，底部分隔线与输入区一体。
3. **持久化**：`persistTabs` 跳过 `kind: 'diff'` 虚拟标签。

## 修改文件

| 文件 | 说明 |
|------|------|
| `src/composables/workbench-state.ts` | `diffTabPath`、`buildDiffOpenFile` |
| `src/App.vue` | `onReviewPatch` 修复 |
| `src/components/workbench/ChatPane.vue` | 栏内嵌 `input-box` |
| `src/components/workbench/ChatTurnChangesBar.vue` | cursor-like 样式 |
| `src/composables/useWorkbench.ts` | persist 过滤 diff |
| `tests/unittest/UT-workbench-diff-tab/workbench-diff-tab.test.ts` | 新增单测 |

## 单测覆盖

- `diffTabPath`、`buildDiffOpenFile` 字段
- `upsertOpenFile` 更新已有 diff 标签

## 注意事项

- `onScmOpenDiff` 仍用 `editorPaneRef`，未在本轮范围
- 打开 Review 后编辑器区域会出现，聊天栏缩至右侧（既有布局行为）
