# 调研链接

- **对照规格（Cursor Composer Task 工具）**：本轮以 Cursor 侧 `Task` 工具契约为 CC 1:1 目标（`description` / `prompt` / `subagent_type` / `model` / `resume` / `readonly` / `run_in_background` / `interrupt` / `file_attachments`；内置类型 generalPurpose、explore、shell、cursor-guide、ci-investigator、best-of-n-runner、git-commit、docs-researcher）。
- `docs/research/research-axecoder-vs-claude-code.md` — §2 Agent 类型、§5 子代理 UI（部分条目已过时，见下）
- `docs/deliverables/agent-tool-layer-parity/` — 已实现 Agent + TaskOutput/TaskStop + `subagent_type`（explore/plan/generalPurpose）
- `docs/deliverables/agent-explore-orchestration/` — Explore 软编排、scratchpad
- `docs/deliverables/agent-session-exec-security/` — `subagent` 进度事件 + Chat 任务条
- `electron/main/agent/agent-subagent.ts` — 内联子代理循环（默认 6 轮、自动 apply 写/Bash）
- `electron/main/agent/agent-subagent-tasks.ts` — 内存 Map 后台任务（无落盘 output_file）
- `electron/main/agent/tool-executor.ts` — `Agent` 工具入口、禁止嵌套子代理
- `electron/main/agent/agent-tool-prompts.ts` — `AGENT_DESCRIPTION`、schema 仅 3 种 `subagent_type`
- `electron/main/agent/agent-ext-executor.ts` — `filterToolsForSubagent`、TaskOutput 无 `block` 轮询
- `electron/main/agent/agent-system-prompt.ts` — `buildDefaultSubAgentSystemPrompt`（通用，无按类型专段）
- `electron/main/ai/model-resolve.ts` — explore/plan → fast 档，其余 → main
- `src/components/workbench/AgentProgressStream.vue` — UI 已标「Task」
- `src/components/workbench/RulesSkillsTab.vue` — 子代理配置占位「Coming in a future release」

**调研缺口：** 仓库内无 Cursor Composer 子代理运行时源码；按 Task 工具公开契约 + 现有 AxeCoder 实现 diff 推导缺口。Claude Code 自定义 `agents/` 目录仅作参考，非 CC 必选。

**已有基线（不计入本轮重复建设）：** `run_in_background`、TaskOutput/TaskStop、Chat `subagent` 进度、explore 写 scratchpad、Workshop `runSubAgentTask` 复用。
