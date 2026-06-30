# agent-tool-layer-parity 实施计划

## 当前背景

AxeCoder Agent 现有 10 个内置工具；与 同类 Agent `getAllBaseTools()` 相比缺 Todo、联网、Notebook、Plan、Skill、MCP、子代理 I/O、ToolSearch、扩展工具及 Agent 类型/并行/Bash 规则。

## 需求

### 功能需求

- 注册并实现缺口表全部工具名；executor 可调用；Plan 模式限制写操作；子代理 `subagent_type` + 后台 TaskOutput/TaskStop；`agent-loop` 并行执行无 pending 的 tool calls。
- Wave 4：WebSearch/LSP/Worktree/Sleep/Brief/Config/Workflow 最小实现 + `getConfig().agentFeatures` 开关。

### 非功能需求

- vitest 单测；不破坏现有 UT-agent-tool-level-prompts（更新期望工具列表）。
- 最小改动原则：扩展逻辑放新文件，`tool-executor` 仅增加分发。

## 实施阶段

### 阶段 1：类型与 Registry（0.5d）

1. 扩展 `AgentToolName`、`AgentContext`、`StoredAgentSession`
2. `agent-tool-prompts-ext.ts` + `agent-tool-registry.ts`
3. 更新 `AGENT_TOOLS` / `SUB_AGENT_TOOLS` 过滤规则

### 阶段 2：Executor 模块（1d）

1. `agent-todo-store.ts` — TodoWrite + Task v2
2. `agent-plan-mode.ts` — Enter/ExitPlanMode
3. `agent-skills.ts` — Skill / DiscoverSkills
4. `agent-web.ts` — WebFetch / WebSearch
5. `agent-notebook.ts` — NotebookEdit
6. `agent-mcp.ts` — MCP 四工具（读 `~/.cursor/mcp.json` stub）
7. `agent-subagent-tasks.ts` — TaskOutput / TaskStop + 后台 Agent
8. `agent-ext-executor.ts` — 汇总 + ToolSearch/LSP/Worktree/其它 stub

### 阶段 3：循环与子代理（0.5d）

1. `agent-loop.ts` — `activeTools`、`Promise.all` 并行
2. `agent-subagent.ts` — subagent_type、filter、background
3. `agent-bash.ts` — git 拦截、`block_until_ms`

### 阶段 4：测试与文档（0.5d）

1. `UT-agent-tool-layer-parity`
2. 更新 `UT-agent-tool-level-prompts` 工具名列表
3. rppit 交付物

## 文件变更清单

| 路径 | 操作 |
|------|------|
| `electron/main/agent/agent-types.ts` | 修改 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 新增 |
| `electron/main/agent/agent-tool-registry.ts` | 新增 |
| `electron/main/agent/agent-ext-executor.ts` | 新增 |
| `electron/main/agent/agent-todo-store.ts` | 新增 |
| `electron/main/agent/agent-skills.ts` | 新增 |
| `electron/main/agent/agent-mcp.ts` | 新增 |
| `electron/main/agent/agent-web.ts` | 新增 |
| `electron/main/agent/agent-notebook.ts` | 新增 |
| `electron/main/agent/agent-subagent-tasks.ts` | 新增 |
| `electron/main/agent/agent-tool-prompts.ts` | 修改 |
| `electron/main/agent/tool-executor.ts` | 修改 |
| `electron/main/agent/agent-loop.ts` | 修改 |
| `electron/main/agent/agent-session-store.ts` | 修改 |
| `electron/main/agent/agent-subagent.ts` | 修改 |
| `electron/main/agent/agent-bash.ts` | 修改 |
| `electron/main/config-store.ts` | 修改（agentFeatures） |
| `tests/unittest/UT-agent-tool-layer-parity/*` | 新增 |
