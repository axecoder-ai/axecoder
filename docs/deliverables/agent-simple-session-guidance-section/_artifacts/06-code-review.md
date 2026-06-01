# 代码审查

## 结论

**通过**（无阻塞项）

## 功能

- §8 与 Claude Code `prompts.ts` 中当前 AxeCoder 可用子集一致（AskUserQuestion + interactive bang 提示）。
- 动态 `null` 与 `interactive: false` 行为有单测覆盖。

## 质量

- 与 §2–§7 相同模式：独立导出函数 + `buildAgentSystemPrompt` 组装。
- 改动面小，无循环依赖。

## 非阻塞待办

- 产品实现 `! <command>` 后做端到端验证。
- 后续 §9 `getSimpleToneAndStyleSection` 对齐。
