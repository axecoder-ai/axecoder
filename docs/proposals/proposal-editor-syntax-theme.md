## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 打开代码文件（如 `.go`）时语法配色异常；用户希望修正并可与壳配色一致。
- **调研来源：** 代码库浏览（调研缺口：无专门调研文档）
- **上游提案：** `docs/proposals/proposal-editor-syntax-theme.md`（双方案草稿）
- **选定基础：** 提案 2 — 通用代码编辑 + Monaco 主题与壳配色对齐
- **用户调整摘要：** 保留 `.md` 的 Preview/Markdown 切换；非 Markdown 文件仅代码编辑模式。

### 现状总结

- `EditorPane.vue` 写死 `language="markdown"`，导致 Go 等按 Markdown 高亮。
- `App.vue` 状态栏写死 `Markdown`。
- Monaco 仅用内置 `vs`/`vs-dark`，与 `data-theme` 三套 CSS 变量未对齐。

---

### 最终方案 – 按扩展名识别语言 + 三套 Axecoder Monaco 主题

- **概述：** 根据文件扩展名设置 Monaco `languageId` 并同步状态栏；为 `vscode` / `aura-light` / `aura-dark` 注册 `defineTheme`，编辑器背景/前景取自 `style.css` 同色值；仅 `.md`/`.markdown` 显示 Preview 切换。
- **相对选定提案的变更：** 无（用户调整与提案 2 一致）。
- **关键变更：**
  - `src/utils/editor-language.ts` — 扩展名 → Monaco id / 显示名 / `isMarkdownPath`
  - `src/utils/monaco-themes.ts` — 主题 id、色板、`registerMonacoThemes()`
  - `src/utils/apply-theme.ts` — `monacoThemeFor` 指向自定义主题 id
  - `src/monaco-setup.ts` 或 `MonacoEditor.vue` — 启动时注册主题
  - `MonacoEditor.vue` — `watch(language)` → `setModelLanguage`
  - `EditorPane.vue` — 动态 language；条件显示预览按钮
  - `App.vue` — 状态栏语言绑定
- **权衡：**
  - ✅ 修复语法高亮根因并改善编辑器与侧栏色差
  - ⚠️ Monaco token 规则沿用 VS Code 系默认色，非逐 token 从 CSS 推导
- **验证：**
  - 单测：`editor-language`、`monacoThemeIdFor` / 色板
  - 手动：Go/TS/MD 三主题可读；`.md` 可 Preview；`.go` 无 Preview 按钮
- **待解决问题：** 用户自定义语言映射、TextMate 主题包（后续）

### 未采纳方案说明

- **未选：** 提案 1（仅扩展名映射 + 内置 vs/vs-dark）
- **原因：** 用户选定提案 2，需壳与 Monaco 配色对齐。
