# 实施计划：agent-simple-doing-tasks-section

## 目标

1:1 接入 §5 `getSimpleDoingTasksSection`；实现 `AskUserQuestion` 工具与 UI 闭环。

## 阶段

### 1. 单测先行

- 扩展 `agent-system-prompt.test.ts`：§5 关键句、`methodName`/`snake case`、OWASP、premature abstraction；组装顺序 intro → system → doing tasks → tool rules。
- 新增 AskUserQuestion 执行器校验单测（非法 questions 返回错误）。

### 2. 系统提示

- `getSimpleDoingTasksSection()`：§5 全员英文 bullets。
- `getAgentToolPathRulesSection()`：原 6 条工具路径规则。
- `buildAgentSystemPrompt` 按 §15 插入 doing tasks。

### 3. AskUserQuestion 工具

- `agent-types` / `agent-tool-defs` / `tool-executor`。
- `pendingAskById` + `finishPending` 扩展 `pendingAsks`。
- `answerAgentQuestions` + IPC + preload + `axecoder.d.ts`。

### 4. UI

- `ChatPane`：`pendingAsks` 展示选项，提交调用 `agentAnswerQuestions`。

### 5. 验收

- `npm test -- tests/unittest/UT-agent-system-prompt/ tests/unittest/UT-agent-glob/`
