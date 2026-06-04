**状态：** 已确认

## 已确认解决方案提案

**上下文：**
- **请求：** 将 CC `Task` 子代理能力 1:1 移植到 AxeCoder **Chat Agent**。
- **调研来源：** `docs/deliverables/agent-subagent-parity/_artifacts/00-research-links.md`；`electron/main/agent/*`。
- **上游提案：** `docs/proposals/proposal-agent-subagent-parity.md`（双方案草稿）
- **选定基础：** 提案 1 – CC Task 契约全量 1:1
- **用户调整摘要：** **范围限定为 Chat Agent**；不修改 Workshop（`workshop-subagent-speaker.ts`、`workshop-agent-speaker.ts` 等）调用链与角色映射。

### 现状总结

AxeCoder 已有 `Agent` 工具、`subagent_type`（generalPurpose/explore/plan）、`run_in_background`、TaskOutput/TaskStop、Chat `subagent` 进度条。缺口：CC 工具名 `Task`、8 种专型、resume/interrupt/model/readonly/file_attachments、TaskOutput `block` 轮询、后台 output 文件、按类型专段 prompt。

---

### 最终方案 – CC Task 契约（Chat-only）

- **概述：** 在 Chat Agent 工具层注册 **`Task`**（`Agent` 保留为别名），参数与 CC 对齐；新增 `agent-subagent-types.ts` 描述 8 种内置类型的工具过滤与 prompt 前缀；实现 resume（`.axecoder/subagents/` 存 transcript + agent id）、interrupt（AbortController）、`model` 覆盖、`readonly`、`file_attachments`（并入子代理 user 消息）；后台任务写入 `output_file` 并支持 TaskOutput `block` 轮询；主 Agent system 委派段改为 Task/CC 用语。Workshop 继续直接调用 `runSubAgentTask`，不经过 Task 工具 schema。
- **相对选定提案的变更：** 自定义 agents **设置 UI** 本轮做 **只读列表 + 加载 `.cursor/agents`**（若目录存在），不做完整 CRUD 编辑器；`cursor-guide` 无 Cursor 文档 MCP 时映射为 **docs-researcher 风格** 只读探索（WebFetch 若未配置则返回明确错误）。
- **关键变更：**
  - `electron/main/agent/agent-subagent-types.ts`（新）
  - `electron/main/agent/agent-subagent-store.ts`（新）
  - `electron/main/agent/agent-subagent.ts`、`agent-subagent-tasks.ts`
  - `electron/main/agent/tool-executor.ts`、`agent-ext-executor.ts`
  - `electron/main/agent/agent-tool-prompts.ts`、`agent-types.ts`
  - `electron/main/agent/agent-system-prompt.ts`（委派段）
  - `tests/unittest/UT-agent-subagent-parity/`
- **权衡：** Chat/Workshop 双路径并存，需在 `runSubAgentTask` 保持向后兼容 options；专型 prompt 用静态表维护，后续可外置 JSON。
- **验证：** `npm test`；UT 覆盖类型过滤、resume、block、interrupt；手工 Chat 启动 explore + background TaskOutput。
- **待解决问题：** `best-of-n-runner` 与既有 `EnterWorktree` 特性整合可后续单独 rppit；子代理 transcript Retention 策略（按 session 清理）。

### 未采纳方案说明

- **未选：** 提案 2 – 最小契约补齐
- **原因：** 用户选定全量 1:1；且 Chat-only 约束不阻碍提案 1 在 Agent 路径落地。
