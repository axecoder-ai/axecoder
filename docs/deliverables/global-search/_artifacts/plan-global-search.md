# 全局搜索 设计文档

**desired_location:** `docs/plans/plan-global-search.md`

## 当前背景

- `fs:search` 已通过 `@vscode/ripgrep` 实现基础文本搜索（`electron/main/fs-ipc.ts:128-166`）。
- 侧栏 `SearchPanel.vue` 需手动点 Search；顶栏 `TitleBar.vue` 用放大镜展示项目名，用户误以为全局搜索。
- 无 Quick Open（⌘P）、无搜索选项（大小写/正则/glob）、无替换。

## 需求

### 功能需求

1. **顶栏语义修正**：文件夹图标 +「项目：{name}」，点击仍打开/切换项目。
2. **侧栏搜索视图**：输入即搜（300ms debounce）；toggle：大小写、全词、正则；include/exclude glob 输入框；结果按文件分组（已有）。
3. **替换**：replace 输入 + Replace / Replace All 按钮；执行前 `confirm`；调用 `fs:searchReplace`。
4. **Quick Open**：⌘P 居中浮层，fuzzy 匹配文件名，回车打开。
5. **⌘⇧F**：打开搜索侧栏，预填编辑器选中文本并触发搜索。

### 非功能需求

- 搜索响应：千文件项目 < 3s。
- 并发：新搜索取消/忽略旧结果（requestId）。
- 替换：仅 UTF-8 文本文件；跳过二进制。

## 设计决策

### 1. 搜索后端

扩展 `runRipgrep(root, query, opts)`：
- `caseSensitive` → 默认 `-i`（不敏感），敏感时不传 `-i`
- `wholeWord` → `-w`
- `regex` → 默认字面量（`rg -F`），regex 时不传 `-F`
- `include` / `exclude` → 追加 `--glob`

### 2. 替换实现

- `fs:searchReplace(root, opts, hits?)`：若传 hits 则只替换这些；否则按当前搜索条件全量替换。
- 逐文件读入 → 按行替换 → `writeFile`；返回 `{ replaced: number, files: number }`。
- 前端 Replace All 前 `window.confirm`。

### 3. Quick Open

- `fs:listProjectFiles(root)` → `runRipgrepFiles(root, '**/*')` 相对路径列表，上限 5000。
- 前端 fuzzy：子序列匹配 + 路径段权重。

## 技术设计

### 核心类型

```ts
type SearchOptions = {
  caseSensitive?: boolean
  wholeWord?: boolean
  regex?: boolean
  include?: string
  exclude?: string
}
```

### 文件变更

| 文件 | 变更 |
|------|------|
| `electron/main/fs-ipc.ts` | 扩展 search/replace/listFiles |
| `electron/main/search-utils.ts`（新） | runRipgrep 参数、replace 逻辑 |
| `electron/preload/index.ts` | 桥接 |
| `src/types/axecoder.d.ts` | 类型 |
| `src/components/workbench/SearchPanel.vue` | 完整 UI |
| `src/components/workbench/QuickOpenPalette.vue` | 新组件 |
| `src/components/workbench/TitleBar.vue` | 顶栏 |
| `src/App.vue` | 编排 |
| `src/composables/useWorkbench.ts` | search/replace/listFiles |
| `src/utils/quick-open-fuzzy.ts`（新） | fuzzy 排序 |
| `electron/main/index.ts` | ⌘P 菜单 |
| `shared/i18n/locales/*.ts` | 文案 |
| `tests/unittest/UT-global-search/*.test.ts` | 单测 |

## 实施计划

### 阶段一：后端（0.5d）

1. 抽 `search-utils.ts`：扩展 `runRipgrep`、实现 `replaceInProject`
2. 扩展 `fs:search`、`fs:searchReplace`、`fs:listProjectFiles` IPC
3. preload + 类型

### 阶段二：前端搜索视图（0.5d）

1. `SearchPanel` debounce + toggles + globs + replace
2. `App.vue` onSearch 传 options；replace 流程
3. TitleBar 修正

### 阶段三：Quick Open + 快捷键（0.5d）

1. `QuickOpenPalette.vue` + fuzzy util
2. `⌘P`、`⌘⇧F` 预填选中文本
3. i18n

### 阶段四：单测（0.5d）

1. `UT-global-search/search-utils.test.ts`
2. `UT-global-search/quick-open-fuzzy.test.ts`
3. 全量跑测

## 测试策略

- 单测：ripgrep 参数构建、replace 行逻辑、fuzzy 排序
- 手工：选项组合、glob 过滤、replace 确认、快捷键
