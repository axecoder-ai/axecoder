## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 优化聊天底部本轮文件变更栏样式（贴近 Cursor）；Review 点击后打开 diff 视图。
- **调研来源：** `ChatTurnChangesBar.vue`、`ChatPane.vue`、`App.vue`、`EditorPane.vue`、`useWorkbench.ts`、`patch-stats.ts`
- **上游提案：** `docs/proposals/proposal-chat-turn-changes-review.md`
- **选定基础：** 提案 2 – 仅修 Review 逻辑 + 变更栏外观微调
- **用户调整：** cursor-like——变更栏与输入框一体、Review 为主按钮

---

### 方案概述

在 `App.vue` 的 `onReviewPatch` 中直接向 `openFiles` 写入 diff 标签并激活，绕过 `EditorPane` 未挂载问题；将 `ChatTurnChangesBar` 移入 `.input-box` 顶部并重做样式（分隔线、文件 pill、Review 主色按钮）。可选在 `workbench-state.ts` 增加 `buildDiffOpenFile` 纯函数便于单测。

### 关键变更

| 模块 | 变更 |
|------|------|
| `workbench-state.ts` | 新增 `buildDiffOpenFile`、`diffTabPath` |
| `App.vue` | `onReviewPatch` 用 `upsertOpenFile` + `activePath` |
| `ChatPane.vue` | 变更栏移入 `input-box` |
| `ChatTurnChangesBar.vue` | cursor-like 内嵌样式 |

### 不在范围

- `useWorkbench.openDiffTab` 统一方法（提案 1）
- `onScmOpenDiff` / `onExternalCompare` 同类修复

### 验证

- 单测：`buildDiffOpenFile` 路径与字段
- 手工：无编辑器标签 → Review → 出现 `hello.go (diff)` 标签并显示左右 diff
- 目视：变更栏与输入框圆角卡片一体

### 待解决问题

- `persistTabs` 应跳过 `kind: 'diff'` 虚拟路径（若尚未过滤）
