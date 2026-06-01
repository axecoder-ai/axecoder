**状态：** 已确认

## 已确认解决方案提案

**上下文：**
- **请求：** 实现 `research-axecoder-vs-claude-code.md` §2 全部工具层缺口 + Bash/子代理增强；Wave 4 须最小可调用（配置开关）。
- **调研来源：** `docs/research/research-axecoder-vs-claude-code.md`、`docs/research/research-claude-code.md` §3；`electron/main/agent/*`。
- **上游提案：** `docs/proposals/proposal-agent-tool-layer-parity.md`（双方案草稿）
- **选定基础：** 提案 2 – 单次大单集全量 1:1
- **用户调整摘要：** Wave 4（WebSearch、LSP、Worktree、Sleep、Brief、Config、Workflow 等）必须注册工具并可调用；未配置时返回明确错误而非静默缺失。

### 最终方案 – 全量 Tool Registry + 扩展 Executor

- **概述：** 扩展 `AgentToolName` 与 `buildAgentTools()` 覆盖缺口表全部工具；`agent-ext-executor.ts` 实现运行时；`agent-loop` 支持 planMode、并行 tool calls、会话级 `activeTools`；子代理支持 `subagent_type`、后台任务与 TaskOutput/TaskStop；Bash 增加 git 危险命令拦截与 `block_until_ms`。
- **相对选定提案的变更：** 因用户要求 Wave 4 最小实现，LSP/WebSearch/Worktree 等在 `agentFeatures` 配置下可启用，默认关闭但 schema 始终注册（或注册+调用返回配置提示）。
- **关键变更：**
  - `electron/main/agent/agent-types.ts` — 工具名联合类型
  - `electron/main/agent/agent-tool-prompts-ext.ts` — 扩展工具 schema/description
  - `electron/main/agent/agent-tool-registry.ts` — 组装与过滤
  - `electron/main/agent/agent-ext-executor.ts` — Todo/Plan/Web/Notebook/Skill/MCP/Task/ToolSearch/其它
  - `electron/main/agent/agent-todo-store.ts`、`agent-subagent-tasks.ts`、`agent-skills.ts`、`agent-mcp.ts`、`agent-web.ts`、`agent-notebook.ts`
  - `tool-executor.ts`、`agent-loop.ts`、`agent-session-store.ts`、`agent-subagent.ts`、`agent-bash.ts`
  - `tests/unittest/UT-agent-tool-layer-parity/`
- **权衡：** 单 PR 面大；扩展工具 description 用统一模板满足 strict 单测下限。
- **验证：** `npm test`；重点 UT 覆盖 TodoWrite、PlanMode、ToolSearch、Skill 发现、并行 loop。
- **待解决问题：** MCP 需用户配置 `~/.cursor/mcp.json`；WebSearch 需 `agentWebSearchApiKey`；LSP 需后续接真实 LSP 客户端。

### 未采纳方案说明

- **未选：** 提案 1 – 仅 Wave 1–3
- **原因：** 用户明确要求全量对齐 + Wave 4 最小可调用。
