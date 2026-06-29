# 调研链接

## 需求来源

- 用户 `/rppit`：原生集成 `Understand-Anything/`（Egonex 知识图谱插件）到 AxeCoder 主进程，使 Agent 可直接利用 `.understand-anything/knowledge-graph.json`。

## Understand-Anything（仓库内 `Understand-Anything/`）

| 模块 | 路径 | 要点 |
|------|------|------|
| 核心包 | `understand-anything-plugin/packages/core/` | `SearchEngine`、`GraphBuilder`、`TreeSitterPlugin`、持久化 `.understand-anything/` |
| Skill 层 | `understand-anything-plugin/skills/` | `/understand` 多智能体 LLM 流水线（7 阶段）生成图谱 |
| 运行时 TS | `understand-anything-plugin/src/` | `buildChatContext`、`buildDiffContext`、`buildExplainContext` |
| Dashboard | `packages/dashboard/` | Vite 交互式图谱 UI |
| 输出 | `.understand-anything/knowledge-graph.json` | 含 summary/layers/tours 的 JSON 图谱 |

## AxeCoder 已有 CodeGraph 集成（参考模式）

| 模块 | 路径 | 要点 |
|------|------|------|
| Vendoring | `electron/main/codegraph/` | 源码 vendoring + CJS dist + `createRequire` 桥接 |
| Manager | `electron/main/codegraph/manager.ts` | open/init/index/watch 会话 |
| Agent 工具 | `agent-codegraph.ts` | CodeGraphExplore/Search/Node |
| 索引 | `.codegraph/` SQLite | 确定性 tree-sitter，实时增量 |
| 交付参考 | `docs/deliverables/agent-codegraph-native/` | 完整 rppit 先例 |

## 关键差异（UA vs CodeGraph）

| 维度 | CodeGraph | Understand-Anything |
|------|-----------|---------------------|
| 索引方式 | 主进程自动 tree-sitter + SQLite | Skill 多代理 LLM 分析（首版耗 token） |
| 节点内容 | 源码 + 调用关系 | 摘要、层级、导览、语义标签 |
| 搜索 | FTS5 + 符号 | Fuse.js 模糊 + 可选 embedding |
| 运行时依赖 | node:sqlite | 纯 JSON + tree-sitter WASM（core 提取用） |

## AxeCoder Agent 扩展点

| 能力 | 路径 |
|------|------|
| 工具注册 | `agent-tool-prompts-ext.ts`、`agent-types.ts` |
| 执行器 | `agent-ext-executor.ts` |
| 系统提示 | `agent-system-prompt.ts` + 动态段 |
| Feature flag | `config-store.ts`（参考 `agentFeatureCodeGraph`） |
| Skills | `agent-skills.ts`（`.cursor/skills` 发现） |

## 调研缺口

- UA core 的 tree-sitter WASM 在 Electron 打包后的资源路径尚未 spike。
- 与 CodeGraph 并存时的 Agent 路由策略（何时用哪个）需在方案中明确。
- 完整 `/understand` LLM 流水线是否纳入主进程首版，还是仅暴露读/搜/解释工具待选型。
