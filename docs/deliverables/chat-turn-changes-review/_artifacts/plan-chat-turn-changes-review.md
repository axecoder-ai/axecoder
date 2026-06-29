# 聊天变更栏 Review 实施计划

**desired_location:** `docs/plans/plan-chat-turn-changes-review.md`

## 当前背景

Agent 全屏聊天时 `EditorPane` 未挂载，`onReviewPatch` 无效。变更栏在输入框外，样式割裂。

## 需求

- Review 打开 diff 标签（无已有编辑器标签时亦可用）
- 变更栏内嵌 `input-box`，Review 主按钮，cursor-like

## 技术设计

### 文件变更（唯一改动）

| 文件 | 变更 |
|------|------|
| `src/composables/workbench-state.ts` | `diffTabPath`、`buildDiffOpenFile` |
| `src/App.vue` | `onReviewPatch` 写 `openFiles` |
| `src/components/workbench/ChatPane.vue` | 栏位移入 `input-box` |
| `src/components/workbench/ChatTurnChangesBar.vue` | 内嵌样式 |
| `src/composables/useWorkbench.ts` | `persistTabs` 跳过 diff |
| `tests/unittest/UT-workbench-diff-tab/workbench-diff-tab.test.ts` | 单测 |

## 实施计划

1. 纯函数 + 单测
2. App.vue Review 修复
3. UI 内嵌与样式
4. 手工验证

## 测试策略

- `buildDiffOpenFile` 字段与路径
- 运行 `npm test` 相关用例
