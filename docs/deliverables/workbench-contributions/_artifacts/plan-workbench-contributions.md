# Workbench 贡献点 + Webview 视图 — 实施计划

## 当前背景

- `src/App.vue` 硬编码 15+ 工作台组件；`SidebarViewBar.vue` 内联 `items` 数组；`command-registry.ts` 手写命令列表。
- `extensions/axecoder/package.json` 已有 VS Code `contributes`，但原生工作台未消费。
- 扩展 webview 基础设施存在于 `extensions/axecoder/out/extension.js`（Companion 模式），原生渲染进程无统一 webview 宿主。

## 需求

### 功能需求

1. 主进程加载并合并内置 manifest + axecoder extension contributes。
2. 渲染进程通过 IPC 获取合并快照（viewsContainers、views、commands、themes）。
3. `SidebarViewBar` 根据 `viewsContainers.activitybar` / 对应 `views` 动态渲染 Tab。
4. 侧栏面板用 `WorkbenchWebview` iframe 加载 `workbench-shell.html#/<viewId>`。
5. iframe 内 `window.axecoder` 经 postMessage 桥代理到父页面。
6. 命令面板合并 manifest `commands`（去重，内置 handler 优先）。
7. V1 迁移侧栏：explorer、search、scm。

### 非功能需求

- 不破坏现有 Agent IPC、编辑器、双窗 Companion。
- 单测覆盖 manifest 合并与 webview URL 解析。
- 最小 diff：编辑器/TitleBar/Chat 本轮可保持原生，侧栏先迁 webview。

## 设计决策

### 1. 贡献点来源

合并 `resources/builtin-workbench/manifest.json` 与 `extensions/axecoder/package.json#contributes`（后者 commands/views 增量合并）。

### 2. Webview 实现

采用**同源 iframe + workbench-shell MPA**（非 Electron `<webview>` 标签），便于 dev HMR 与 CSP 一致。

### 3. 父 iframe 通信

- 子 → 父：`webview:event`（UI 事件）、`webview:rpc`（axecoder 调用）
- 父 → 子：`webview:call`（调用子页面暴露的方法，如 `openProject`）

## 技术设计

### 核心类型（`shared/workbench-contributions/types.ts`）

```typescript
export type WorkbenchViewContribution = {
  id: string
  name: string
  type: 'webview'
  webviewEntry?: string // hash route, default = id
}
export type WorkbenchContributions = {
  viewsContainers: Record<string, Array<{ id: string; title: string; icon?: string }>>
  views: Record<string, WorkbenchViewContribution[]>
  commands: Array<{ command: string; title: string; category?: string }>
  themes: Array<{ id: string; label: string }>
}
```

### 文件变更

| 路径 | 操作 |
|------|------|
| `shared/workbench-contributions/*` | 新增 |
| `resources/builtin-workbench/manifest.json` | 新增 |
| `electron/main/workbench-contributions-ipc.ts` | 新增 |
| `electron/main/index.ts` | 注册 IPC |
| `electron/preload/index.ts` | 暴露 API |
| `src/types/axecoder.d.ts` | 类型 |
| `workbench-shell.html` | 新增 |
| `src/workbench-shell/*` | 新增 |
| `src/components/workbench/WorkbenchWebview.vue` | 新增 |
| `src/utils/workbench-webview-url.ts` | 新增 |
| `src/utils/workbench-webview-bridge.ts` | 新增 |
| `src/composables/useWorkbenchContributions.ts` | 新增 |
| `src/components/workbench/SidebarViewBar.vue` | 修改 |
| `src/App.vue` | 侧栏改 webview |
| `vite.config.ts` | 多页入口 |
| `vitest.config.ts` | `@shared` alias |
| `tests/unittest/UT-workbench-contributions/*` | 新增 |

## 实施计划

### 阶段一：注册表与 IPC（0.5d）

1. 定义类型与 `mergeContributions`
2. 内置 manifest 落盘
3. 主进程 IPC + preload

### 阶段二：Webview 壳（0.5d）

1. `workbench-shell` MPA + 路由
2. `WorkbenchWebview` + RPC 桥
3. 挂载 explorer/search/scm 组件

### 阶段三：工作台接入（0.5d）

1. `SidebarViewBar` 读贡献点
2. `App.vue` 替换侧栏直挂组件
3. 命令合并

### 阶段四：测试与文档

1. 单测全绿
2. 实现报告 / 审查 / 交付合并

## 测试策略

- `mergeContributions`：重复 command 去重、views 合并
- `resolveWorkbenchShellUrl`：dev/prod URL
- `workbench-webview-bridge`：RPC 请求/响应序列化

## 已知限制

- ChatPane、BottomPanel、Settings 仍原生；后续 manifest + webview 迁入。
- 第三方扩展目录扫描不在 V1。
