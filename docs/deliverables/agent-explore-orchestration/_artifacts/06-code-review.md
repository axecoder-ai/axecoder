# 代码审查：agent-explore-orchestration

## 结论

**通过**（无阻塞项）

## 功能

- 对照已确认方案：Chat-only、软编排、四项能力均已落地。
- 与 同类 Agent 路径一致：prompt 段 + 每轮 attachment 式注入 + explore 报告 scratchpad。

## 质量

- 改动集中在 `electron/main/agent/`，无无关扩散。
- 注入 strip 防重复堆叠，与 Context budget 模式一致。
- `AGENT_TOOL_NAMES_FOR_PROMPT` 与 enabled 工具解耦，略需后续与 `AGENT_TOOLS` 单源（非阻塞）。

## 安全

- scratchpad 仍在 `.axecoder/scratchpad`，会话隔离；无新 shell 面。

## 非阻塞待办

- P2：Workshop 共享 explore-summary，避免四角色重复 Grep。
- P2：`todo_reminder` 式「久未 TodoWrite」轻提醒（Claude `attachments.ts` 完整版）。
- P2：UT-agent-tool-layer-parity 中 TodoWrite 断言可改为新文案。
