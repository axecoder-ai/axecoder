# Master → VS Code 分支功能迁移计划

## 背景与目标

当前分支 `vscode` 已完成 **VS Code OSS 壳 + `extensions/axecoder` 扩展** 的基础迁移（[`extension.ts`](extensions/axecoder/src/extension.ts) 仅注册 Chat 侧栏）。`master` 分支领先 3 个提交，包含 v0.9.5 会话偏好、SCM 风格、聊天变更栏、文件图标、Agent system prompt 等能力。

**迁移原则**（见 [`DEPRECATED-IDE-SHELL.md`](src/components/workbench/DEPRECATED-IDE-SHELL.md)）：

| 维度 | master（Electron 自研壳） | vscode 分支目标 |
|------|--------------------------|----------------|
| **IDE 壳布局** | `App.vue` 五区布局 | VS Code 原生 Explorer / SCM / Terminal / Editor |
| **图标** | TitleBar / SidebarViewBar codicon | Activity Bar `media/icon.svg` + VS Code 命令/菜单 codicon |
| **Chat 布局** | ChatPane + AgentsPanel + 可拖拽分隔条 | [`ChatApp.vue`](extensions/axecoder/webview/src/chat/ChatApp.vue) 复用同组件 |
| **AI 功能** | 全量 196 功能点 | `@axecoder/core` + RPC + Webview 接线 |

---

## 阶段 0：基线对齐（master 提交合入）

| 提交 | 内容 | 关键文件 |
|------|------|----------|
| `65546d0` | v0.9.5 会话偏好、原生确认框、文件图标 | `session-preferences.ts`、`FileIcon.vue`、`appConfirm.ts` |
| `ee9a683` | VS Code 风格 SCM、聊天变更栏、diff 打开修复 | `ChatTurnChangesBar.vue`、`patch-stats.ts`、`ChatPane.vue` |
| `dbb3dfc` | Agent system prompt 准则 | `agent-system-prompt.ts` → `packages/axecoder-core` |

**验证**：`npm run core:build && npm run ext:compile` 通过；`ChatTurnChangesBar` 在 Chat Webview 中可见；切换会话时模式/模型按 session 持久化。

---

## 阶段 1：图标对齐

- Activity Bar `media/icon.svg` + `package.json` viewsContainers
- TitleBar 按钮 → VS Code 命令（Settings / Metrics / Trace / Companion / Toggle Chat）
- Webview 加载 `@vscode/codicons`；恢复 `AgentSpinnerGlyph.vue`

---

## 阶段 2：Chat 侧栏布局对齐

- `ChatApp.vue`：Agents 拖拽分隔条 + `reviewPatch` → VS Code diff
- `registerCompanionCommands` + RPC `getWindowRole` / `isCompanionWindowOpen`
- 扩展 `vscode-theme.css` 全量 `--wc-*` token

---

## 阶段 3：扩展模块接线

- `extension.ts` 注册 workshop-panels、observability、companion
- `vite.config.ts` 构建 chat/workshop/metrics/trace/settings 五个 bundle
- `package.json` 补命令、menus、keybindings

---

## 阶段 4：RPC 能力补齐

| RPC 方法 | 迁移方案 |
|----------|----------|
| `openMetricsWindow` / `openTraceWindow` | 调 `axecoder.openMetrics/Trace` |
| `openCompanionWindow` | 调 `axecoder.toggleCompanion` |
| `getLastProject` / `getRecentProjects` | `context.globalState` |
| `codeGraphStatus` / `codeGraphIndex` | `@axecoder/core/codegraph/manager` |
| MCP OAuth | 接 core `mcp-oauth-connect` + `agent-mcp-runtime` |
| `watchStart/Stop` | `FileSystemWatcher` |
| `openFileAtPath` + diff | `open-diff.ts` + `vscode.diff` |

---

## 阶段 5：功能回归

- **P0** Chat/Agent：ChatTurnChangesBar、session-preferences、Agent turnFileChanges
- **P1** Workshop/Draw.IO 独立面板
- **P2** Settings 各 Tab + MCP
- **P3** Metrics/Trace WebviewPanel
- **P4** VS Code 原生 IDE 冒烟
- **P5** CodeGraph 打开工作区自动索引

---

## 阶段 6：测试与交付

1. `npm test` — UT-session-preferences、UT-patch-stats、UT-vscode-rpc、UT-agent-system-prompt
2. 手动冒烟：`npm run dev` → `scripts/dev-vscode.sh`
3. 本文档：`plans-todos-master-vscode-migration.md`

---

## 关键文件索引

| 用途 | 路径 |
|------|------|
| 扩展入口 | `extensions/axecoder/src/extension.ts` |
| RPC 映射 | `extensions/axecoder/src/rpc/registry.ts` |
| Chat UI 壳 | `extensions/axecoder/webview/src/chat/ChatApp.vue` |
| Diff 打开 | `extensions/axecoder/src/services/open-diff.ts` |
| 共享核心 | `packages/axecoder-core/` |
| 功能规格 | `features/功能清单.md`、`features/页面布局与按钮.md` |

---

## 实施状态（2026-06-29）

- [x] 从 master 恢复 ChatPane、ChatTurnChangesBar、session-preferences、FileIcon 等
- [x] axecoder-core：agent-system-prompt、turnFileChanges、patch-stats
- [x] extension.ts 接线 Workshop / Metrics / Trace / Companion
- [x] 五 Webview bundle 构建
- [x] package.json 命令与 codicon 菜单
- [x] RPC：最近项目、CodeGraph、MCP、diff 审查、文件监听
- [x] ChatApp Agents 拖拽分隔条
- [x] 单测 44 项通过（相关 UT）
