# 选型记录

## 2a 选型摘要

**需求：** 对齐 Claude Code §14，为 AxeCoder 全部 `AGENT_TOOLS` 实现 API 级长 `description` 与参数说明。

| 维度 | 提案 1 就地扩写 | 提案 2 独立 agent-tool-prompts.ts |
|------|----------------|-----------------------------------|
| 核心思路 | 在 `agent-tool-defs.ts` 内直接加长 | 独立 prompts 模块 + `buildAgentTools()` |
| 改动范围 | 单文件 + 单测 | 新模块 + defs 变薄 + 单测 |
| 优点 | diff 最少 | 可维护、与 output-styles 分层一致 |
| 缺点 | 单文件臃肿 | 多一文件 |
| 工作量 | 小 | 中 |
| 适合场景 | 一次性小改 | 持续对齐 §14 |

**推荐：** 提案 2。

**关键差异：** 提案 1 不新增模块；提案 2 便于单测逐工具断言长文关键短语。用户要求 **strict**：尽量接近 Claude Code 篇幅。

## 2b 用户选择

- **选定：** 提案 2 – 独立 `agent-tool-prompts.ts` + 工厂组装
- **调整：** strict — 尽可能接近 Claude Code 原文篇幅（无二进制源码前提下尽量加长）
