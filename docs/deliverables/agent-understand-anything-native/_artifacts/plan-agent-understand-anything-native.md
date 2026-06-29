# Understand-Anything 原生集成 — 实施计划

**desired_location:** `docs/plans/plan-agent-understand-anything-native.md`

## 当前背景

- AxeCoder 已有 CodeGraph（`.codegraph/` SQLite + Agent 三工具）。
- 仓库内 vendored `Understand-Anything/`，输出 `.understand-anything/knowledge-graph.json`（含 summary/layers）。
- Workshop 模式先例：Draw.IO（专用工具 + 右侧面板）、Software Co.（SOP 编排）。

## 需求

### 功能需求

1. 新增 **`understand` Chat 模式**（Workshop 嵌入）。
2. 主进程 **读图谱**：loadGraph、Fuse 搜索、buildContext。
3. Agent 工具 P0：**UnderstandSearch**、**UnderstandContext**、**UnderstandExplain**、**UnderstandDiff**（Understand 模式专用工具集）。
4. **Understand 模式 turn**：`sendUnderstandWorkshopMessage`（仿 draw-io-turn）。
5. **Dashboard WebView**：本地 HTTP 服务 + webview 加载。
6. **内置 Skill** `/understand` 注册。
7. Feature flag：`agentFeatureUnderstandAnything`（默认 true）。

### 非功能需求

- 单测用 fixture JSON，不依赖 LLM 跑 `/understand`。
- 无图谱时工具返回明确错误 + UI 引导。

## 设计决策

1. **薄封装而非全量 vendoring core** — 首版仅 port loadGraph/search/context（fuse.js），避免 tree-sitter WASM 打包复杂度。
2. **Understand 模式工具白名单** — 仿 draw-io，仅开放 Understand* + Read/Grep 等只读工具。
3. **Dashboard 静态服务** — main 进程 `127.0.0.1`  ephemeral server，`GRAPH_DIR=projectRoot`。

## 实施计划

### 阶段 1：understand-anything 主进程层

1. `graph-types.ts`、`manager.ts`
2. `understand-anything-ipc.ts`、`dashboard-server.ts`
3. 单测

### 阶段 2：Chat 模式 + Workshop

1. chat-modes / chat-mode.ts / workshop-ipc
2. `understand-turn.ts`、`UnderstandDashboardEmbed.vue`
3. ChatPane / WorkshopChatSection 分支

### 阶段 3：Agent 工具

1. agent-understand-anything.ts、prompt、executor、types
2. config flag

### 阶段 4：内置 Skill + 验收

1. `resources/builtin-skills/understand/SKILL.md`（精简入口）
2. `npm test` 全绿

## 文件变更清单

| 路径 | 操作 |
|------|------|
| `electron/main/understand-anything/*` | 新增 |
| `electron/main/understand-anything-ipc.ts` | 新增 |
| `electron/main/understand-anything/understand-turn.ts` | 新增 |
| `electron/main/agent/agent-understand-anything*.ts` | 新增 |
| `electron/main/agent/chat-mode.ts` | 修改 |
| `electron/main/workshop-ipc.ts` | 修改 |
| `src/utils/chat-modes.ts` | 修改 |
| `src/components/workbench/*` | 修改 |
| `resources/builtin-skills/understand/SKILL.md` | 新增 |
| `tests/unittest/UT-understand-anything/` | 新增 |
| `package.json` | 修改（fuse.js） |
