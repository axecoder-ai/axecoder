# 方案选型

## 2a 选型摘要

**需求：** 对齐 同类 Agent `outputStyles.ts` 内置 Default / Explanatory / Learning，接入 `buildAgentSystemPrompt` 与可选配置。

| 维度 | 提案 1 仅后端 | 提案 2 后端 + UI |
|------|---------------|------------------|
| 核心思路 | prompt 模块 + config 字段 | 同上 + General 下拉 |
| 改动范围 | main + 单测 | + Renderer 设置 |
| 优点 | 最小 diff | 用户可发现、可切换 |
| 缺点 | 需手改 config | 略增 UI |
| 工作量 | 小 | 小–中 |
| 适合 | 纯对齐验证 | 产品可用 |

**推荐：提案 2** — 与现有 `agentAutoApplyWrites` 设置模式一致，满足「内置功能」可发现性。

## 2b 用户选择

- **选定：** 提案 2 – 后端 + General 设置下拉
- **调整：** 无额外调整
