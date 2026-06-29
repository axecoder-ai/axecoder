## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 工作台引入 VS Code 兼容贡献点；命令/视图/主题由 manifest 注册；**视图全部通过 webview 渲染**。
- **调研来源：** `docs/deliverables/workbench-contributions/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-workbench-contributions.md`
- **选定基础：** 提案 1 – 贡献点注册表 + 内置 Manifest
- **用户调整摘要：** 直接改用 webview（不用原生 Vue 直挂映射）；manifest 与 `extensions/axecoder/package.json` 对齐；V1 仅内置 manifest。

---

### 最终方案 – 贡献点注册表 + Webview 视图宿主

- **概述：** 新增 `WorkbenchContributionRegistry`（主进程加载、渲染进程订阅），合并 `resources/builtin-workbench/manifest.json` 与 `extensions/axecoder/package.json#contributes`。侧栏/底栏可贡献视图统一由 `WorkbenchWebview.vue`（iframe）加载 `workbench-shell` 多页 bundle（`#/explorer`、`#/search`、`#/scm` 等）；iframe 内通过 `postMessage` RPC 桥访问 `window.axecoder`。命令面板与快捷键从合并后的 `commands` 贡献点生成，handler 仍注册在渲染进程。
- **相对选定提案的变更：** 原提案允许 `viewId → Vue 组件` 静态映射；**用户要求全部 webview**，故新增 `workbench-shell` 独立入口，在 iframe 内挂载原 `FileExplorer` / `SearchPanel` / `ScmPanel` 等组件，外层 `App.vue` 只保留布局槽位与桥接。
- **关键变更：**
  - `shared/workbench-contributions/` — 类型、manifest 合并
  - `resources/builtin-workbench/manifest.json` — 内置贡献点
  - `electron/main/workbench-contributions-ipc.ts` — IPC
  - `workbench-shell.html` + `src/workbench-shell/` — webview 内 Vue 子应用
  - `src/components/workbench/WorkbenchWebview.vue` — iframe 宿主 + 桥
  - `src/composables/useWorkbenchContributions.ts`
  - `SidebarViewBar.vue`、`command-registry.ts`、`App.vue` — 改读注册表
  - `vite.config.ts` — 增加 `workbench-shell` 多页入口
  - 单测：`tests/unittest/UT-workbench-contributions/`
- **权衡：**
  - ✅ 对齐 VS Code `contributes` 声明；未来可合并第三方 manifest
  - ✅ 本系统 IPC/Agent 不变，webview 仅多一层桥
  - ❌ iframe 与父窗通信用 postMessage，调试略复杂
  - ❌ Chat/底栏等大块 UI 在后续阶段迁入 webview bundle
- **验证：** manifest 合并单测；侧栏三视图 iframe 加载与文件打开回归；命令面板条目与 manifest 一致
- **待解决问题：** `extensions/axecoder/webview/dist` 与 `workbench-shell` 长期合并策略；webview 热更新；扩展启用/禁用 UI

### 未采纳方案说明

- **未选：** 提案 2 – Extension Host Bridge
- **原因：** 用户选择提案 1；Host 进程成本高，与本系统 Electron 主进程能力重复。
