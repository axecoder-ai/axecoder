# 步骤 2 选型

## 2a 选型摘要

**需求：** 对齐 Claude Code §11 动态段（`SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 之后），接入 `buildAgentSystemPrompt`。

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 核心思路 | 边界 + memory/env/language/summarize | 完整注册表 + scratchpad/config/FRC 占位 |
| 改动范围 | `agent-system-prompt.ts`、`agent-loop`、单测 | 新模块 + 配置 + 会话目录 |
| 优点 | 小改、语义对齐、无空话 | 结构一次到位 |
| 风险 | FRC/scratchpad 后续再做 | 未实现能力写进 prompt |
| 工作量 | 中 | 大 |

**推荐：提案 1**

## 2b 用户选择

- AskQuestion 已跳过 → **采用推荐：提案 1**
- **调整：** 语言段默认 `中文`

## 2c 落盘

见上文。
