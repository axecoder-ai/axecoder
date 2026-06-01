# 编辑器语法高亮与 Monaco 主题 — 实施计划

## 当前背景

- 编辑器从 WritCraft Markdown 中心演进，Monaco 仍写死 `markdown`。
- 壳 UI 已有三套 `data-theme` CSS 变量；Monaco 使用 `vs`/`vs-dark`。

## 需求

### 功能需求

- 按 `activePath` 扩展名设置 Monaco 语言（`.go` → `go` 等）。
- 切换标签/文件时更新 model language；状态栏显示对应语言名。
- 注册三套 Monaco 主题，背景/前景与 `style.css` 一致。
- 仅 Markdown 文件显示 Preview / Markdown 切换；其它文件始终代码编辑。

### 非功能需求

- 遵循 `frontend-multi-theme.mdc`；主题切换时 `setTheme` 无闪烁。
- 最小改动，不引入外部主题包。

## 设计决策

### 1. 语言映射

- 纯函数 `editor-language.ts`，常见扩展名表；未知 → `plaintext`。

### 2. Monaco 主题

- `defineTheme` + `inherit: true`，`base` 为 `vs-dark`（深色）或 `vs`（浅色）。
- `editor.background` / `editor.foreground` 与 `--wc-panel` / `--wc-text` 同色十六进制（与 CSS 同步维护）。
- 语法 token 使用 VS Code 系默认前景色（深色/浅色各一套 rules）。

### 3. 注册时机

- `monaco-setup.ts` 导入并导出 `ensureMonacoThemesRegistered()`；`MonacoEditor` `onMounted` 调用一次。

## 实施步骤

1. TDD：`UT-editor-language/editor-language.test.ts`
2. TDD：`UT-monaco-themes/monaco-themes.test.ts`
3. 实现 `editor-language.ts`、`monaco-themes.ts`
4. 更新 `apply-theme.ts`、`monaco-setup.ts`、`MonacoEditor.vue`
5. 更新 `EditorPane.vue`、`App.vue`
6. `npm test` 全绿

## 文件变更

- `src/utils/editor-language.ts`（新）
- `src/utils/monaco-themes.ts`（新）
- `src/utils/apply-theme.ts`
- `src/monaco-setup.ts`
- `src/components/workbench/MonacoEditor.vue`
- `src/components/workbench/EditorPane.vue`
- `src/App.vue`
- `tests/unittest/UT-editor-language/editor-language.test.ts`（新）
- `tests/unittest/UT-monaco-themes/monaco-themes.test.ts`（新）
