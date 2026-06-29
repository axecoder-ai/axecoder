# 方案选型记录

## 一句话需求回顾

为原生 Electron 工作台引入 VS Code 兼容的**贡献点注册表**，使命令/视图/主题由 manifest 声明并动态挂载；**视图一律通过 webview（iframe 沙箱）渲染**，替代 `App.vue` 硬编码 Vue 面板。

## 方案对比表（摘要）

| 维度 | 提案 1 Manifest-first | 提案 2 Extension Host | 提案 3 Phase 0 |
|------|----------------------|----------------------|----------------|
| 核心思路 | 注册表 + 内置 manifest | 扩展宿主进程 | 仅命令贡献点 |
| VS Code 对齐 | contributes 子集 | 完整 Host | 仅 commands |
| 本系统功能 | webview + RPC 桥接 | 需大量迁移 | 视图仍硬编码 |
| 工作量 | 中 | 大 | 小 |

## 关键差异

- 提案 1 可在保留 Electron Agent/IPC 的同时对齐 manifest 声明。
- 提案 2 启动成本高，与本系统原生模块边界复杂。
- 提案 3 不满足视图/主题扩展诉求。

## 推荐方案

**推荐：提案 1 – 贡献点注册表 + 内置 Manifest**

## 用户最终选择

- **选定提案：** 提案 1 – 贡献点注册表 + 内置 Manifest（Manifest-first）
- **调整说明：**
  - **直接改用 webview**：所有 `contributes.views` 中声明的视图类型为 `webview`，通过 `workbench-shell` iframe 加载独立 bundle，不复用 `viewId → 原生 Vue 直挂`。
  - manifest 字段与 `extensions/axecoder/package.json` `contributes` 对齐（commands / viewsContainers / views / menus / themes 子集）。
  - V1 仅内置 manifest，不扫描第三方扩展目录。
  - 编辑器区（Monaco）、TitleBar、StatusBar 仍保留原生壳层；侧栏与可贡献面板走 webview。
