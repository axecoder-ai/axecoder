# 内置 CodeGraph 代码知识图谱 — 实施计划

**desired_location:** `docs/plans/plan-agent-codegraph-native.md`

## 当前背景

- AxeCoder Agent 靠 Read/Grep/Glob + LSP + explore 子代理理解代码，大仓库 tool call 多、token 贵。
- 仓库内已有完整 `codegraph/` 开源实现（tree-sitter + SQLite + ToolHandler）。
- MCP 运行时已有，但 CodeGraph 工具非一等 Agent 工具。

## 需求

### 功能需求

1. vendoring：迁移 `codegraph/src` → `electron/main/codegraph/src`（排除 installer/bin/ui）。
2. 构建：`codegraph:build` 编译 dist + 拷贝 schema.sql 与 wasm。
3. Manager：按 `projectRoot` open/init/index，复用 `.codegraph/`。
4. Agent 工具 P0：`CodeGraphExplore`、`CodeGraphSearch`、`CodeGraphNode`。
5. system prompt：索引存在时注入 CodeGraph 使用指引。
6. feature flag：`agentFeatureCodeGraph`（默认 true）。

### 非功能需求

- 单测不依赖真实大仓库；fixture ≤ 5 个 TS 文件。
- 工具输出对齐 `ToolHandler.execute` 文本格式。

## 设计决策

1. **CJS 子包 + createRequire** — vendored 源保持 CommonJS 编译，主进程 ESM 通过 bridge 加载，避免 120 文件改 ESM。
2. **复用 ToolHandler** — 不重写 explore/search 逻辑，映射工具名到 `codegraph_*`。
3. **懒加载 index** — 首次 CodeGraph 工具调用时若未初始化则 `initSync` + `indexAll`（可配置后续改为打开项目时后台 index）。

## 实施计划

### 阶段 1：Vendoring + 构建

1. rsync `codegraph/src` → `electron/main/codegraph/src`
2. tsconfig + copy-assets + root 依赖

### 阶段 2：Bridge + Manager

1. `bridge.ts` / `manager.ts`
2. 单测 manager 生命周期

### 阶段 3：Agent 集成

1. 工具 schema + executor + system prompt 段
2. config flag

### 阶段 4：验收

1. `npm run codegraph:build && npm test`
2. 落盘 05-implement-report / 05-unittest

## 文件变更清单

| 路径 | 操作 |
|------|------|
| `electron/main/codegraph/src/**` | 新增（vendored） |
| `electron/main/codegraph/tsconfig.json` | 新增 |
| `electron/main/codegraph/copy-assets.mjs` | 新增 |
| `electron/main/codegraph/manager.ts` | 新增 |
| `electron/main/codegraph/bridge.ts` | 新增 |
| `electron/main/agent/agent-codegraph.ts` | 新增 |
| `electron/main/agent/agent-codegraph-prompt.ts` | 新增 |
| `electron/main/agent/agent-types.ts` | 修改 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 修改 |
| `electron/main/agent/agent-ext-executor.ts` | 修改 |
| `electron/main/agent/agent-system-prompt.ts` | 修改 |
| `electron/main/config-store.ts` | 修改 |
| `electron/main/models-types.ts` | 修改 |
| `package.json` | 修改 |
| `tests/unittest/UT-agent-codegraph-native/*` | 新增 |
