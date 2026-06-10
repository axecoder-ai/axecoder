# 方案选型记录 — codex-provider

## 2a. 选型摘要

### 一句话需求回顾

在 AxeCoder 模型设置中新增 **Codex Provider**，对接 OpenAI **Responses API**，使 Codex 系列模型可用于聊天与 Agent 工具调用；不混用 Chat Completions 协议。

### 方案对比表

| 维度 | 提案 1 独立 `codex` Provider | 提案 2 `openai` 内 wireApi 切换 | 提案 3 文档 + 外部代理 |
|------|------------------------------|----------------------------------|------------------------|
| 核心思路 | 第四 Provider + Responses 适配层 | 同一 openai 条目切换 chat/responses | 不自研，用户自建代理 |
| 主要改动范围 | models-types、providers/codex、wire/SSE、UI、单测 | ModelEntry 新字段 + openai 内分支 | 仅文档 |
| 优点 | 语义清晰；与 DeepSeek 等 Chat 兼容分离 | UI 选项少 | 零开发 |
| 缺点 / 风险 | 8–12 人日；Responses wire 复杂 | 易误配；支持话术难统一 | 无产品级能力 |
| 工作量（粗估） | 大 | 中 | 小 |
| 适合场景 | 正式支持 Codex API 用户 | 想少一个下拉项 | 暂无开发人力 |

### 关键差异说明

- 选 **提案 1**：Settings 出现独立 **Codex** 选项，Agent/聊天走 `/v1/responses`。
- 选 **提案 2**：仍选 OpenAI Provider，但多一个 wire 下拉；DeepSeek 与 Codex 共用同一 Provider 名。
- 选 **提案 3**：代码不变，用户自行部署 responses-proxy。
- 提案 1/2 均需实现 Responses wire；提案 3 不做。
- Agent 工具闭环是提案 1/2 的必验项；提案 3 依赖代理质量。

### 推荐方案

**推荐：提案 1 – 独立 `codex` Provider + 完整 Responses 适配**

与可行性报告、用户需求一致；避免 openai Provider 承担两种不兼容协议；长期支持成本最低。

### 选型提示

用户在本轮命令中已明确选择提案 1 方向。

---

## 2b. 用户最终选择

- **选定提案：** 提案 1 – 独立 `codex` Provider + 完整 Responses 适配
- **用户原话：** 「新增第四 Provider，完整 Responses 适配」
- **调整说明：** 无额外调整

## 2c. 落盘时间

2025-06-10
