## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** Monaco 将 `!=` 等显示为连字（如 `≠`），用户希望按字面字符显示。
- **调研来源：** 代码库浏览（调研缺口）
- **上游提案：** `docs/proposals/proposal-editor-font-ligatures.md`（双方案草稿）
- **选定基础：** 提案 1 — 关闭编辑器连字（默认修复）
- **用户调整摘要：** 无额外调整

### 现状总结

- `MonacoEditor.vue` 创建编辑器时 `fontLigatures: true`，配合 `JetBrains Mono` 触发编程连字。

---

### 最终方案 – 关闭 Monaco 字体连字

- **概述：** 将 `fontLigatures` 设为 `false`，`!=`、`<=` 等以 ASCII 显示。
- **相对选定提案的变更：** 无
- **关键变更：** `src/components/workbench/MonacoEditor.vue`
- **权衡：** 最小改动；暂不提供用户开关
- **验证：** 手动打开 Go/TS 文件确认运算符显示；回归现有单测
- **待解决问题：** 无

### 未采纳方案说明

- **未选：** 提案 2（设置项控制连字）
- **原因：** 用户选定提案 1，优先最小改动
