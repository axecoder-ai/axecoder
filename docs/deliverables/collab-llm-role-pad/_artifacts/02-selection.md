# 选型记录

## 2a 选型摘要

**一句话需求回顾：** 协作群聊在映射为 LLM API 消息时，连续相同角色（assistant/tool/user）会导致接口报错；需在编排层插入内容为 `continue` 的隐藏 `user` 消息，前端不展示。

| 维度 | 提案 1 API 出线层统一填充 | 提案 2 仅 Workshop 编排插入 |
|------|---------------------------|-----------------------------|
| 核心思路 | `padAgentLoopMessages` 统一处理 Chat+Workshop | `pushMessage` 前检测同 API 角色并插入隐藏 user |
| 主要改动范围 | `openai-messages`、`chat-with-tools`、workshop 历史映射 | `workshop-orchestrator`、`workshop-types`、UI 过滤 |
| 优点 | Agent tool 链一并修复 | 改动面小、与现有编排贴近 |
| 缺点 / 风险 | 改动面较大 | Agent 单轮内 tool 链仍可能需另修 |
| 工作量 | 中 | 小 |
| 适合场景 | 长期统一 Chat/Workshop | 快速消除协作多角色连发问题 |

**关键差异：**
- 提案 1 在出线前统一 pad，Workshop 与 Chat 共用规则。
- 提案 2 仅在写入 Workshop 会话时插入隐藏消息，不改动全局 Agent 出线。
- 提案 2 持久化含 `hidden` 字段；提案 1 可仅出线时 pad（用户未选此调整）。

**推荐：提案 1** — 与「协作并入统一会话、未来多轮 AgentLoop」更一致，且覆盖 tool 链。

**选型提示：** 下一步选择题确认；细节见 `docs/proposals/proposal-collab-llm-role-pad.md`。

## 2b 用户最终选择

- **选定提案：** 提案 2 – 仅 Workshop 编排时插入隐藏 user 消息
- **调整说明：** 无额外调整
