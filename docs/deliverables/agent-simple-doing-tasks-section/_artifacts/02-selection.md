# 选型记录

## 2a 摘要

- **需求：** 1:1 对齐 Claude Code §5 `getSimpleDoingTasksSection`；与 §2–4 同模式接入 `buildAgentSystemPrompt`。
- **推荐：** 提案 1 – 独立 `getSimpleDoingTasksSection()` + 工具路径规则独立段。

## 2b 用户选择

- **选定：** 提案 1
- **调整说明：** 将 `AskUserQuestion` **也实现**（Agent 工具 + 暂停等待用户作答后继续循环）。
