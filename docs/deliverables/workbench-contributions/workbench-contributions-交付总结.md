---
任务名: workbench-contributions
完成日期: 2026-06-29
选定方案: 提案 1 – 贡献点注册表 + Webview 视图宿主
审查结论: 通过
单测: 791/791 全绿
---

# Workbench 贡献点 + Webview — 交付总结

## 1. 概述

**需求：** 原生工作台对齐 VS Code `contributes` 声明，命令/视图由 manifest 注册；**视图直接走 webview（iframe）**，去掉侧栏硬编码 Vue 直挂。

**选型：** 提案 1 + 用户调整「直接改用 webview」。

**交付目录：** `docs/deliverables/workbench-contributions/`

---

## 2. 方案

- 主进程合并 `resources/builtin-workbench/manifest.json` 与 `extensions/axecoder/package.json#contributes`。
- 侧栏 explorer / search / scm 由 `workbench-shell.html` iframe 加载，组件仍在 iframe 内复用原 Vue 实现。
- 父页面经 `postMessage` 代理 `window.axecoder` 与子视图方法调用。

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| VS Code manifest 对齐 | ✅ | ✅ |
| 本系统 IPC | ✅ 桥接 | 重 |
| 视图 webview | ✅（用户要求） | ✅ |

**用户选择：** 提案 1，并明确要求全部视图 webview 化（V1 先完成侧栏三视图）。

详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

阶段：注册表 IPC → webview-shell → App 接入 → 单测。

全文：`_artifacts/plan-workbench-contributions.md`

---

## 5. 实现说明

- 新增 `WorkbenchWebview`、`workbench-shell` MPA、`mergeContributions`。
- `SidebarViewBar` 动态 items；`App.vue` 侧栏三面板改 iframe。
- 命令：`registerManifestCommands` 合并 axecoder 声明命令。

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试

- 命令：`npm test`
- 166 files / 791 tests 全通过
- 新增 UT-workbench-contributions（3 cases）

详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 自动化：全绿
- 手工建议：dev 启动后验证侧栏切换、打开项目、搜索、Git 面板与命令面板 manifest 命令

---

## 8. 代码审查

**结论：通过**。非阻塞：Chat/底栏/Settings 待迁 webview；主题动态注册；扩展开关 UI。

详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `shared/workbench-contributions/` | 新增 | 类型与合并 |
| `resources/builtin-workbench/manifest.json` | 新增 | 内置贡献点 |
| `electron/main/workbench-contributions-ipc.ts` | 新增 | IPC |
| `workbench-shell.html` + `src/workbench-shell/` | 新增 | webview 子应用 |
| `src/components/workbench/WorkbenchWebview.vue` | 新增 | iframe 宿主 |
| `src/App.vue` | 修改 | 侧栏 webview |
| `SidebarViewBar.vue` | 修改 | 动态 Tab |
| `command-registry.ts` | 修改 | manifest 命令 |
| `vite.config.ts` | 修改 | 多页入口 |

---

## 10. 遗留项

1. ChatPane、BottomPanel、SettingsPanel webview 化
2. `contributes.themes` 驱动主题 CSS
3. 第三方扩展目录扫描与启用 UI
4. 与 Companion vscode-host 收敛

---

## 11. 附录：过程文档索引

| 文件 |
|------|
| `_artifacts/00-research-links.md` |
| `_artifacts/02-selection.md` |
| `_artifacts/proposal-workbench-contributions.md` |
| `_artifacts/plan-workbench-contributions.md` |
| `_artifacts/05-implement-report.md` |
| `_artifacts/05-unittest.md` |
| `_artifacts/06-code-review.md` |
