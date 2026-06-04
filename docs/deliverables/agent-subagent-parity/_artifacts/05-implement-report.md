# 功能实现报告 — agent-subagent-parity

## 功能说明

在 **Chat Agent** 路径将 Cursor Composer **Task** 子代理能力对齐到 AxeCoder：

- 注册 **Task** 工具（`Agent` 别名归一化为 `Task`）
- **8+1 种** `subagent_type`（CC 八种 + 保留 `plan`），静态配置工具过滤与 prompt 前缀
- **resume**（`.axecoder/subagents/{sessionId}/{agentId}.json`）、**interrupt**、**model** 覆盖、**readonly**、**file_attachments**
- 后台子代理 **output 文件** + **TaskOutput `block`** 轮询
- 主 Agent 委派段与 multi-agent chat-mode 改为 Task 用语

**范围：** 未改 Workshop `workshop-subagent-speaker.ts` 调用链（用户约束 chat-only）。

## 修改文件列表

| 文件 | 说明 |
|------|------|
| `electron/main/agent/agent-subagent-types.ts` | 新增：CC 专型配置与工具过滤 |
| `electron/main/agent/agent-subagent-store.ts` | 新增：transcript 持久化 |
| `electron/main/agent/agent-subagent.ts` | resume/readonly/model/attachments/abort |
| `electron/main/agent/agent-subagent-tasks.ts` | output 文件、block 等待、interrupt |
| `electron/main/agent/tool-executor.ts` | Task 工具执行 |
| `electron/main/agent/agent-tool-prompts.ts` | Task schema + description |
| `electron/main/agent/agent-tool-aliases.ts` | Agent→Task |
| `electron/main/agent/agent-types.ts` | Task 工具名、SubagentType 扩展 |
| `electron/main/agent/agent-tool-registry.ts` | 子代理工具过滤委托 |
| `electron/main/agent/agent-ext-executor.ts` | TaskOutput block |
| `electron/main/agent/agent-system-prompt.ts` | Task 委派段 |
| `electron/main/agent/chat-mode.ts` | multi-agent 揭示 Task |
| `tests/unittest/UT-agent-subagent-parity/` | 新增单测 |
| 若干既有单测 | 对齐 Task/英文/i18n 漂移 |

## 单测覆盖

- `UT-agent-subagent-parity`：类型归一、shell/explore 过滤、别名、store、block 等待
- 回归：`UT-agent-tool-level-prompts`、`UT-agent-explore-orchestration`、`UT-chat-mode-workshop`

## 注意事项

- `cursor-guide` 无 Cursor 文档 MCP 时依赖本地 Read/Grep；WebFetch 需配置。
- 自定义 `.cursor/agents` 目录 UI 未做（提案中列为后续）；仅运行时可通过 resume 文件续跑。
- Workshop 仍使用 `runSubAgentTask` 直接调用，不经 Task 工具 schema。
