# agent-subagent-parity 设计文档

## 当前背景

- Chat Agent 已有 `Agent` 工具、`runSubAgentTask`、后台 TaskOutput/TaskStop、3 种 `subagent_type`。
- CC 使用 `Task` 工具，8 种内置专型，支持 resume/interrupt/model/readonly/file_attachments 与 TaskOutput `block`。
- Workshop 经 `workshop-subagent-speaker.ts` 直接调 `runSubAgentTask`（本轮不改）。

## 需求

### 功能需求

1. 注册 **Task** 工具（`Agent` 别名归一化为 Task）。
2. `subagent_type` 对齐 CC 八种 + 保留 `plan`。
3. 各类型 **工具过滤 + prompt 前缀**（`agent-subagent-types.ts`）。
4. **resume** / **interrupt**、**model** 覆盖、**readonly**、**file_attachments**。
5. 后台任务 **output 文件** + TaskOutput **`block` 轮询**。
6. 子代理 transcript 存 `.axecoder/subagents/{sessionId}/`。
7. 主 Agent 委派段改为 Task 用语。

### 非功能需求

- Workshop 路径零行为变化。
- 单测 `UT-agent-subagent-parity` 覆盖类型过滤、store、block。

## 设计决策

### 1. Task vs Agent

- 对外 schema 以 **Task** 为主；`normalizeAgentToolCall` 将 `Agent` → `Task`。
- `buildCoreAgentTools` 注册 Task；保留 Agent 条目兼容旧会话。

### 2. 专型实现

- 静态表 `SUBAGENT_TYPE_CONFIGS`；未知类型回退 `generalPurpose`。
- `shell`：`shellOnly` 仅 Bash/Read/Grep/Glob。
- `cursor-guide`：只读 + docs 风格前缀（无 Cursor MCP 时 WebFetch 可能报错）。

## 实施计划

| 阶段 | 任务 |
|------|------|
| 1 | 单测：types 过滤、store 读写、TaskOutput block |
| 2 | `agent-subagent-types.ts`、`agent-subagent-store.ts` |
| 3 | 扩展 `agent-subagent.ts`、`agent-subagent-tasks.ts` |
| 4 | `tool-executor` Task 参数；`agent-ext-executor` block |
| 5 | `agent-tool-prompts.ts`、`agent-types.ts`、aliases、system-prompt |
| 6 | `npm test` 全绿 |

## 文件变更

- 新增：`agent-subagent-types.ts`、`agent-subagent-store.ts`、`tests/unittest/UT-agent-subagent-parity/`
- 修改：`agent-subagent.ts`、`agent-subagent-tasks.ts`、`tool-executor.ts`、`agent-ext-executor.ts`、`agent-tool-prompts.ts`、`agent-types.ts`、`agent-tool-aliases.ts`、`agent-system-prompt.ts`、`agent-tool-registry.ts`
