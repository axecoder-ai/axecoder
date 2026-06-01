# 功能实现报告 — agent-tool-layer-parity

## 功能说明

对齐 Claude Code `getAllBaseTools()` 缺口表，在 AxeCoder Agent 中注册并实现 **36** 个工具（10 核心 + 26 扩展），含：

- **待办：** TodoWrite、TaskCreate/Get/Update/List
- **联网：** WebFetch；WebSearch（配置开关 + API Key 占位）
- **Notebook：** NotebookEdit（.ipynb cell）
- **计划模式：** EnterPlanMode / ExitPlanMode（会话 + ctx.planMode，阻断写/Bash）
- **Skill：** Skill / DiscoverSkills（`.cursor/skills`）
- **MCP：** CallMcpTool、McpAuth、ListMcpResources、ReadMcpResource（读 `~/.cursor/mcp.json` stub）
- **子代理 I/O：** TaskOutput / TaskStop；Agent 支持 `subagent_type`、`run_in_background`
- **ToolSearch：** 搜索工具并 reveal 到 `activeTools`
- **Wave4 stub：** LSP、Worktree、Sleep、Brief、Config、Workflow（`agentFeature*` 配置开关）
- **循环：** `agent-loop` 并行执行 tool calls；`getSessionActiveTools` 懒暴露扩展工具
- **Bash：** `isDangerousGitCommand` 拦截 force push / git config / hard reset

## 修改文件列表

| 文件 | 说明 |
|------|------|
| `electron/main/agent/agent-types.ts` | 扩展 `AgentToolName`、工具名常量 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 扩展工具 schema/description |
| `electron/main/agent/agent-tool-registry.ts` | 组装全量工具、子代理过滤 |
| `electron/main/agent/agent-ext-executor.ts` | 扩展工具运行时 |
| `electron/main/agent/agent-todo-store.ts` | Todo/Task 会话存储 |
| `electron/main/agent/agent-subagent-tasks.ts` | 后台子代理任务表 |
| `electron/main/agent/agent-skills.ts` | Skill 发现与读取 |
| `electron/main/agent/agent-mcp.ts` | MCP 配置读取 stub |
| `electron/main/agent/agent-web.ts` | WebFetch / WebSearch |
| `electron/main/agent/agent-notebook.ts` | NotebookEdit |
| `electron/main/agent/agent-tool-defs.ts` | `AGENT_TOOLS` = 全量 |
| `electron/main/agent/tool-executor.ts` | Plan 阻断、Agent 后台、扩展分发 |
| `electron/main/agent/agent-loop.ts` | 并行 tools、activeTools、sessionId |
| `electron/main/agent/agent-session-store.ts` | planMode、revealedToolNames |
| `electron/main/agent/agent-subagent.ts` | subagent_type、并行、工具过滤 |
| `electron/main/agent/agent-bash.ts` | Git 安全 |
| `electron/main/agent/agent-tool-prompts.ts` | Agent 参数 subagent_type/background |
| `electron/main/models-types.ts` / `config-store.ts` | agentFeature* 开关 |
| `tests/unittest/UT-agent-tool-layer-parity/*` | 新增单测 |
| `tests/unittest/UT-agent-tool-level-prompts/*` | 更新 36 工具期望 |

## 注意事项

- MCP / WebSearch / LSP 为 **最小可调用 stub**，完整协议需后续接 SDK。
- 默认 `activeTools` 通过 ToolSearch reveal 扩展工具（核心 10 + 常用扩展始终可见）。
- 用户选型为提案 2 全量；Wave4 按调整说明以 feature flag + stub 交付。
