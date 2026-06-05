# 功能实现报告

## 概述

将 `codegraph/` 源码 vendoring 至 `electron/main/codegraph/`，编译为 CommonJS 子包，经 `createRequire` 桥接进 AxeCoder 主进程；Agent 新增 **CodeGraphExplore / CodeGraphSearch / CodeGraphNode** 三个一等工具；首次调用自动 `init + index`，索引存项目 `.codegraph/`。

## 功能点

1. **Vendoring**：rsync `codegraph/src`（排除 installer/bin/ui）→ `electron/main/codegraph/src/`（97 个 TS 文件）
2. **构建**：`npm run codegraph:build`（tsc + 拷贝 schema.sql / tree-sitter wasm）
3. **桥接**：`bridge.ts` + `manager.ts`（会话缓存、懒 init/index、ToolHandler 执行）
4. **Agent 工具**：`agent-codegraph.ts` + prompt 段 + `agent-ext-executor` 路由
5. **配置**：`agentFeatureCodeGraph` 默认 `true`
6. **System prompt**：索引状态动态段 `getCodeGraphInstructionsSection`

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/codegraph/src/**` | vendored CodeGraph 引擎 |
| `electron/main/codegraph/bridge.ts` | CJS 加载器 |
| `electron/main/codegraph/manager.ts` | 项目会话与工具执行 |
| `electron/main/codegraph/tsconfig.json` | 子包编译 |
| `electron/main/codegraph/package.json` | `"type": "commonjs"` |
| `electron/main/agent/agent-codegraph*.ts` | Agent 集成 |
| `electron/main/agent/agent-types.ts` 等 | 工具名与 executor |
| `package.json` | 依赖 + codegraph:build |
| `tests/unittest/UT-agent-codegraph-native/` | 单测 |

## 注意事项

- **SQLite**：依赖 `node:sqlite`（Node 22.5+）；Vitest/开发机可用；Electron 29 内置 Node 20 需在运行时升级 Electron 或后续加 wasm 回退。
- **构建顺序**：改 vendored 源后须 `npm run codegraph:build`。
- **二期**：callers/callees/impact/status/files 工具、设置页、打开项目后台 index。
