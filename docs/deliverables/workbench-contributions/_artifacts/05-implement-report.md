# 功能实现报告

## 功能说明

1. **贡献点注册表**：`shared/workbench-contributions/` 定义 VS Code `contributes` 子集类型与 `mergeContributions`；主进程 `workbench-contributions-ipc.ts` 合并 `resources/builtin-workbench/manifest.json` 与 `extensions/axecoder/package.json`。
2. **Webview 侧栏**：`workbench-shell.html` 独立 MPA，iframe 内挂载 Explorer / Search / SCM；`WorkbenchWebview.vue` 负责加载与 `postMessage` RPC 桥。
3. **工作台接入**：`SidebarViewBar` 读贡献点；`App.vue` 侧栏改 webview；`command-registry` 支持 `registerManifestCommands`。
4. **IPC**：`window.axecoder.getWorkbenchContributions()`。

## 修改文件列表

| 路径 | 说明 |
|------|------|
| `shared/workbench-contributions/types.ts` | 贡献点类型 |
| `shared/workbench-contributions/merge.ts` | manifest 合并 |
| `resources/builtin-workbench/manifest.json` | 内置贡献点 |
| `electron/main/workbench-contributions-ipc.ts` | 主进程 IPC |
| `electron/main/index.ts` | 注册 IPC |
| `electron/preload/index.ts` | 暴露 API |
| `src/types/axecoder.d.ts` | 类型 |
| `workbench-shell.html` | webview MPA 入口 |
| `src/workbench-shell/*` | iframe 内子应用 + 桥 |
| `src/components/workbench/WorkbenchWebview.vue` | iframe 宿主 |
| `src/components/workbench/SidebarViewBar.vue` | 动态 Tab |
| `src/utils/workbench-webview-url.ts` | URL 解析 |
| `src/utils/workbench-webview-bridge.ts` | 父子通信 |
| `src/composables/useWorkbenchContributions.ts` | 渲染进程订阅 |
| `src/utils/command-registry.ts` | manifest 命令合并 |
| `src/App.vue` | 侧栏 webview 化 |
| `vite.config.ts` | 多页构建 |
| `vitest.config.ts` | `@shared` alias |
| `tests/unittest/UT-workbench-contributions/*` | 单测 |

## 单测覆盖

- `mergeContributions` 命令去重、views 合并
- `resolveWorkbenchShellUrl` dev/prod URL

## 注意事项

- ChatPane、BottomPanel、Settings 仍为原生 Vue；后续按 manifest 迁入 webview。
- iframe 内 `window.axecoder` 为 RPC 代理，调试时注意 postMessage 链路。
- 生产包需确保 `resources/builtin-workbench/manifest.json` 随 `APP_ROOT` 可读。
