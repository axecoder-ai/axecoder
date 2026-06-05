# 方案提案：内置 CodeGraph 代码知识图谱（主进程嵌入）

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 在 AxeCoder Electron 主进程内嵌入 tree-sitter + SQLite 代码知识图谱，等效于将 `codegraph/` 搬进主进程，Agent 通过原生工具调用。
- **调研来源：** `docs/deliverables/agent-codegraph-native/_artifacts/00-research-links.md`
- **上游提案：** 双方案草稿（步骤 1）
- **选定基础：** 提案 2 – 源码 vendoring 进 `electron/main/codegraph/`
- **用户调整摘要：** 无额外调整

---

### 最终方案 – 源码 vendoring + Agent 原生工具

- **概述：** 将 `codegraph/src/`（剔除 `installer/`、`bin/`、`ui/`）迁移至 `electron/main/codegraph/src/`，在子目录独立 `tsc` 编译为 CommonJS `dist/`；主进程通过 `createRequire` 加载 `CodeGraph` 与 `ToolHandler`；新增 `codegraph-manager` 管理项目 open/index/watch；暴露 **CodeGraphExplore / CodeGraphSearch / CodeGraphNode** 三个一等 Agent 工具（P0）；索引存项目 `.codegraph/`；`agentFeatureCodeGraph` 控制开关（默认 true）。
- **相对选定提案的变更：** 首版 Agent 工具先暴露 3 个核心工具（explore/search/node），其余 MCP 工具（callers/callees/impact/status/files）二期追加；不含设置页 UI。
- **关键变更：**
  - 新增 `electron/main/codegraph/`（vendored 源 + tsconfig + copy-assets）
  - 新增 `electron/main/codegraph/manager.ts`、`bridge.ts`
  - 新增 `electron/main/agent/agent-codegraph.ts`、`agent-codegraph-prompt.ts`
  - 修改 `agent-types.ts`、`agent-tool-prompts-ext.ts`、`agent-ext-executor.ts`、`agent-system-prompt.ts`、`config-store.ts`、`models-types.ts`
  - 修改 `package.json`（依赖 + `codegraph:build` 脚本）
  - 新增 `tests/unittest/UT-agent-codegraph-native/`
- **权衡：**
  - 优点：引擎完全内嵌、可定制；Agent 直接调用、无 MCP 子进程
  - 缺点：`node:sqlite` 需 Node 22.5+（Vitest/开发机满足；Electron 29 内置 Node 20 需在 adapter 层检测并给出明确错误，或后续升级 Electron）
- **验证：** Vitest：小 fixture init→index→search→explore；`npm test` 全绿
- **待解决问题：** Electron 运行时 SQLite 后端；项目打开自动 index；Workshop 子 Agent 共享索引

### 未采纳方案说明

- **未选：** 提案 1（npm 库依赖）、提案 3（MVP 自研）
- **原因：** 用户选型要求完全内嵌源码，非外部依赖或精简自研。
