**状态：** 已确认

## 已确认解决方案提案

**上下文：**
- **请求：** 1:1 对齐 同类 Agent `getSimpleDoingTasksSection`（§5 全员）；接入 `buildAgentSystemPrompt`（§15：intro → system → doing tasks → 工具路径规则）。
- **调研来源：** `参考实现/docs/参考实现-system-prompts-full.md` §5、§15
- **选定：** 提案 1
- **用户调整：** 实现 `AskUserQuestion` 工具（结构化提问、暂停会话、用户作答后继续 Agent 循环）。

### 最终方案

- **概述：** 新增 `getSimpleDoingTasksSection()`，§5 **全员**英文 bullet 原文（不含 Ant 内部、Claude 产品帮助段）。原 `AGENT_DOING_TASKS_SECTION` 更名为 `getAgentToolPathRulesSection()`。新增 `AskUserQuestion` 工具定义、执行器、`pendingAsks` 会话暂停与 `agent:answerQuestions` IPC；Chat 面板展示选项并提交答案。

- **关键变更：**
  - `electron/main/agent/agent-system-prompt.ts`
  - `electron/main/agent/agent-types.ts`
  - `electron/main/agent/agent-tool-defs.ts`
  - `electron/main/agent/tool-executor.ts`
  - `electron/main/agent/agent-loop.ts`
  - `electron/main/agent/agent-session-store.ts`
  - `electron/main/agent-ipc.ts`
  - `electron/preload/index.ts`
  - `src/types/axecoder.d.ts`
  - `src/components/workbench/ChatPane.vue`（及可选小组件）
  - `tests/unittest/UT-agent-system-prompt/`

- **验证：** Vitest 断言 §5 关键句与组装顺序；AskUserQuestion 参数校验单测；`npm test` 相关目录全绿。

- **待解决问题：** §6 `getActionsSection`、§7 `getUsingYourToolsSection` 后续迭代。
