# 选型记录

## 一句话需求回顾

将 Agent 上下文 compact 从规则截断升级为 LLM 摘要式压缩，保留关键决策与文件路径，对齐 同类 Agent `/compact`。

## 方案对比表

| 维度 | 提案 1 Agent 内嵌 LLM + 回退 | 提案 2 独立服务 + Settings |
|------|------------------------------|----------------------------|
| 核心思路 | 现有模块加 LLM 路径，失败回退 | 统一服务 + llm/rule 配置 |
| 主要改动范围 | agent-context-compact、agent-loop、agent-ipc | 新模块 + config + UI + chat-compact |
| 优点 | 改动小、快落地 | Agent+Chat 一致、可配置 |
| 缺点 / 风险 | Chat 仍规则截断 | 改动面大 |
| 工作量 | 小 | 中 |

## 推荐方案

**推荐：提案 1 – Agent 内嵌 LLM 摘要 + 规则回退**

## 用户最终选择

- **选定提案：** 提案 1 – Agent 内嵌 LLM 摘要 + 规则回退
- **调整说明：** 用户跳过 AskQuestion；按推荐方案落地，无额外调整
