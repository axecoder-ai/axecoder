# 功能实现报告：Agent 探索编排（Chat · Claude 对齐）

## 功能说明

对齐 同类 Agent 的 **软编排**，降低 Chat Agent 重复 Read/Grep：

1. **System prompt**：`getTodoManagementSection`、`getAgentDelegationSection`（>3 次搜索用 `Agent(explore)`）、`getScratchpadInstructionsSection`、`getFunctionResultClearingSection`（含 SUMMARIZE 文案）。
2. **每轮注入**：`prepareSessionBeforeModel` 通过 `<agent-context-injection>` 回灌 Todo 列表与 `scratchpad/explore-summary.md`。
3. **Explore 落盘**：`Agent(subagent_type=explore)` 成功后将 report 写入 scratchpad。
4. **TodoWrite 返回**：文案对齐 Claude「继续用 todo 跟踪」。

**未做：** Workshop 编排、强制 explore→implement 阶段机。

## 修改文件

| 文件 | 说明 |
|------|------|
| `electron/main/agent/agent-context-inject.ts` | 新增：todo/scratchpad 注入块 |
| `electron/main/agent/agent-system-prompt.ts` | 新增 Claude 对齐 prompt 段 |
| `electron/main/agent/agent-loop.ts` | `prepareSessionBeforeModel` 注入；Chat `buildAgentSystemPrompt` 传 scratchpad/FRC |
| `electron/main/agent/agent-ext-executor.ts` | TodoWrite 工具结果文案 |
| `electron/main/agent/tool-executor.ts` | explore 子代理写 scratchpad |
| `tests/unittest/UT-agent-explore-orchestration/*` | 单测 |

## 单测覆盖

- `agent-context-inject.test.ts`：todo 注入、scratchpad 摘要
- `agent-system-prompt-sections.test.ts`：三段 prompt 关键字

## 注意事项

- 注入仅在 **有 sessionId 的 Agent 循环** 生效；Workshop 会话也会吃到 todo 注入，但未改 Workshop speaker。
- 步数下降依赖模型遵守指引，需手工对比 toolLog。
