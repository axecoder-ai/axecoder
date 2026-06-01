# 方案选型记录

## 2a. 选型摘要

### 一句话需求回顾

在 AxeCoder Agent 系统提示中实现 Claude Code 的 `getSimpleIntroSection` 结构（角色 + `CYBER_RISK_INSTRUCTION` + URL 约束），并纳入 `buildAgentSystemPrompt`；用户要求模块化落盘且开场身份使用 AxeCoder 品牌。

### 方案对比表

| 维度 | 提案 1 单文件最小拆分 | 提案 2 独立 agent-system-prompt.ts |
|------|----------------------|-----------------------------------|
| 核心思路 | 在 `agent-tool-defs.ts` 内新增函数并拼接 | 新模块承载 intro/组装，tool-defs 仅工具定义 |
| 主要改动范围 | 1 个 TS 文件 + 单测 | 2 个 TS 文件 + re-export + 单测 |
| 优点 | 改动最小 | 后续可继续拆 §4–§7 section |
| 缺点 / 风险 | 文件变臃肿 | 多一层 import |
| 工作量（粗估） | 小 | 中 |
| 适合场景 | 只落地 intro 一段 | 计划逐步对齐 Claude Code prompts 结构 |

### 关键差异说明

- 提案 1 不新建文件；提案 2 将 system prompt 与 tool defs 分离。
- 两者均可在 `buildAgentSystemPrompt` 首部插入 `getSimpleIntroSection()`。
- 提案 2 更利于后续 `getSimpleSystemSection` 等同文件扩展。

### 推荐方案

**推荐：提案 1 – 单文件最小拆分**

**推荐理由：** 本轮仅 intro 一段，单文件即可满足 1:1 文案与单测，上线风险最低。

### 选型提示

用户通过 AskQuestion 确认最终方案与调整说明。

---

## 2b. 用户最终选择

- **选定提案：** 提案 2 – 独立 `agent-system-prompt.ts` 模块化
- **调整说明：** 开场身份改为 AxeCoder（非 Claude Code 原文逐字身份句）

## 2c. 落盘时间

2026-06-01
