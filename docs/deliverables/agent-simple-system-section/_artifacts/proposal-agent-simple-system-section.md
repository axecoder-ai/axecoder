## 已确认解决方案提案

**状态：** 已确认

**上下文：**
- **请求：** 1:1 实现 Claude Code `getSimpleSystemSection`（§4），接入 `buildAgentSystemPrompt`（§15：intro → system → doing tasks）。
- **调研来源：** `claude-code/docs/claude-code-system-prompts-full.md` §4、§15
- **选定：** 提案 1 – 英文原文常量 + `getSimpleSystemSection()`
- **调整说明：** 无

### 最终方案

- **概述：** 在 `electron/main/agent/agent-system-prompt.ts` 新增 `getSimpleSystemSection()`，内容为 §4 六条 bullet 英文原文；`buildAgentSystemPrompt` 在 intro 与 `AGENT_DOING_TASKS_SECTION` 之间插入该段。`agent-tool-defs.ts` re-export。

- **关键变更：**
  - `electron/main/agent/agent-system-prompt.ts`
  - `electron/main/agent/agent-tool-defs.ts`（re-export）
  - `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts`

- **验证：** Vitest `UT-agent-system-prompt`；断言原文关键句与组装顺序。

- **待解决问题：** §5 `getSimpleDoingTasksSection` 等后续段落。
