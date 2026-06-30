# 方案选型

## 2a 选型摘要

**需求：** 对齐 同类 Agent §8 `getSessionSpecificGuidanceSection`，接入 `buildAgentSystemPrompt`。

| 维度 | 提案 1 动态函数 | 提案 2 静态常量 |
|------|----------------|-----------------|
| 核心思路 | 按 `enabledToolNames` / `interactive` 拼接，无项返回 null | 固定段落始终注入 |
| 改动范围 | `agent-system-prompt.ts` + 单测 | 同上 |
| 优点 | 与 同类 Agent 一致，可扩展 Agent/Skill | 代码最少 |
| 缺点 | 略多 API | 与 Claude 条件语义不一致 |
| 工作量 | 小 | 小 |
| 适合 | 长期对齐 Claude | 一次性最小 patch |

**关键差异：**
- 提案 1 可在关闭 `AskUserQuestion` 或 `interactive: false` 时省略对应 bullet。
- 提案 2 无法表达「无启用项则不输出段落」。
- 两者均暂不包含 Agent/Skill/Verification（AxeCoder 无对应工具）。

**推荐：提案 1 – 动态函数 + 按当前工具裁剪**

## 2b 用户选择

- **选定：** 提案 1（用户跳过 AskQuestion，按 `/rppit 实现` 与推荐方案执行）
- **调整说明：** 无额外调整；保留 `! <command>` 英文原文（`interactive` 默认 true）
