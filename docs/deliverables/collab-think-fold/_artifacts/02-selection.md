# 选型记录

## 2a 选型摘要

**需求回顾：** 协作群聊每个角色应先展示思考过程，思考结束后折叠，再展示正式结论；与连续同 API 角色的 hidden pad 兼容。

### 方案对比表

| 维度 | 提案 1 reasoningContent + 分通道 | 提案 2 UI 快照拆条 | 提案 3 JSON 双字段 |
|------|----------------------------------|-------------------|-------------------|
| 核心思路 | 消息字段对齐 Chat，推理/正文分通道落盘 | 运行时 AgentProgressStream，结束时快照为 reasoning 条 | Prompt 强制 JSON |
| 主要改动 | types、llm、orchestrator、MessageItem | orchestrator 插入思考条、Pane/MessageItem |  mainly llm prompt |
| 优点 | 模型原生 reasoning、可回看 | 改动面小、快上线 | 全提供商一致 |
| 缺点 / 风险 | 多提供商降级 | system/kind 语义需约定 | 与 subagent 冲突 |
| 工作量 | 中 | 小 | 中 |
| 适合场景 | 长期与 Chat 统一 | 先满足折叠体验 | 无 reasoning API 时 |

### 关键差异

- 提案 1 持久化 `reasoningContent` 字段；提案 2 用 `kind:'reasoning'` 独立消息条。
- 提案 2 不重构 `workshop-llm` 分通道，主要靠编排落盘 + UI 折叠。
- 提案 3 不适合当前 Agent 型 speaker。

### 推荐

**推荐：提案 1** — 与 OpenAI reasoning、Chat 类型一致，长期维护成本低。

### 选型提示

下一步通过选择题确认；细节见 `docs/proposals/proposal-collab-think-fold.md`。

---

## 2b 用户选择

- **选定提案：** 提案 2 – 仅 UI 层：运行时进度块 + 落盘拆条
- **调整说明：** 无额外调整
