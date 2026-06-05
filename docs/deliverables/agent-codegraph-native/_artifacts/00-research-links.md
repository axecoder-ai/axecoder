# 调研链接

## 需求来源

- 用户 `/rppit`：将 `codegraph/`（tree-sitter + SQLite 代码知识图谱）搬进 AxeCoder 主进程，作为内置「代码理解外挂」。

## CodeGraph（仓库内 `codegraph/`）

| 模块 | 路径 | 要点 |
|------|------|------|
| 公共 API | `codegraph/src/index.ts` | `CodeGraph.init/open/indexAll/sync/searchNodes/buildContext` |
| 数据库 | `codegraph/src/db/` | SQLite（node:sqlite / wasm 回退）、schema.sql、FTS5 |
| 提取 | `codegraph/src/extraction/` | tree-sitter WASM、20+ 语言 extractor |
| 图谱 | `codegraph/src/graph/`、`resolution/` | 调用关系、框架路由解析 |
| MCP 工具 | `codegraph/src/mcp/tools.ts` | `codegraph_explore/search/node/...` 实现与输出格式 |
| 同步 | `codegraph/src/sync/` | 文件 watcher、git hooks、增量 sync |
| 规模 | ~120 个 TS 源文件 | 含 installer/CLI（AxeCoder 不需要） |

## AxeCoder 现状

| 能力 | 路径 | 与 CodeGraph 关系 |
|------|------|-------------------|
| Agent 工具注册 | `electron/main/agent/agent-tool-registry.ts` | 可新增 CodeGraph* 原生工具 |
| MCP 运行时 | `electron/main/agent/agent-mcp*.ts` | 已有 CallMcpTool，但非一等工具 |
| LSP | `electron/main/lsp/`、`agent-lsp.ts` | 互补，非替代 |
| explore 子代理 | `agent-subagent.ts` | 仍依赖 Grep/Read |
| 构建 | `package.json` ESM + vite-plugin-electron | 需处理 codegraph CJS/wasm/schema 拷贝 |

## 调研缺口

- Electron 打包后 codegraph WASM / schema.sql 资源路径尚未验证（需在实现阶段 spike）。
- codegraph 引擎为 CommonJS 构建，AxeCoder 主进程为 ESM，需选定 `file:` 依赖 + 动态 import 或预构建 dist。
