# 方案选型记录

## 2a 选型摘要

### 一句话需求回顾

将 **Cursor Composer（CC）** 的 `Task` 子代理能力 **1:1** 接入 AxeCoder **Chat Agent**；Workshop 既有 `runSubAgentTask` 路径不在本轮改动范围内。

### 方案对比表

| 维度 | 提案 1 – CC Task 全量 1:1 | 提案 2 – 最小契约补齐 |
|------|---------------------------|------------------------|
| 核心思路 | `Task` 契约 + 8 种专型 + resume/interrupt + 自定义 agents | 保留 `Agent` 名，补高频参数，专型二期 |
| 主要改动范围 | 主进程子代理栈 + Task schema + 存储 + Chat UI/设置 | 主进程子代理 + TaskOutput block |
| 优点 | 与 CC 提示词/模型行为一致 | 交付快、风险小 |
| 缺点 / 风险 | 面大；部分 CC 专型需降级策略 | 非严格 1:1 |
| 工作量（粗估） | 大 | 中 |
| 适合场景 | 用户明确要求 1:1 | 时间紧、可接受差异清单 |

### 关键差异说明

- 选 **提案 1** 会引入 **`Task` 工具名**（可保留 `Agent` 别名）及 **8 种 `subagent_type`** 的专型 prompt/工具集。
- 选 **提案 1** 会实现 **`resume` / `interrupt`** 与后台 **`output_file` + TaskOutput `block`**，提案 2 仅部分实现。
- 选 **提案 2** 不做自定义 `.cursor/agents` 与设置页，与「1:1」目标有差距。
- 两方案均可复用现有 `runSubAgentTask` 与 `agent-subagent-tasks` 骨架。
- **用户约束「仅 Chat」**：两方案均可限定不改 Workshop；提案 1 仍可在 Chat 侧做全量 Task 契约。

### 推荐方案

**推荐：提案 1 – CC Task 契约全量 1:1**

**推荐理由：** 需求原文为 1:1 移植；项目已有 Agent/TaskOutput 基线，补全 Task 契约与专型映射比二期返工成本低。若工期极紧可改选提案 2，但须接受行为差异清单。

**选型提示：** 下一步通过选择题确认提案与调整说明。

---

## 2b 用户最终选择

- **选定提案：** 提案 1 – CC Task 契约全量 1:1
- **调整说明：** **仅 Chat Agent**；Workshop 子代理（`workshop-subagent-speaker.ts` 等）逻辑不改。

## 2c 落盘

本文件即 2c 选型记录。
