## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 思考在 AI 回复下方；AI 身份仅来自 users.json；保留全部用户消息；未绑定员工禁止发言。
- **调研来源：** `collab-think-fold`、`settings-users`、`WorkshopPane.vue`、`workshop-orchestrator.ts`
- **上游提案：** `docs/proposals/proposal-collab-workshop-display.md`（双方案草稿）
- **选定基础：** 提案 1 – 单条消息复合结构
- **用户调整摘要：** 严格模式：无 users.json 对应条目的员工角色跳过发言（系统提示），不 fallback 虚构昵称。

### 最终方案 – assistant 复合消息 + 严格身份绑定

- **概述：** `WorkshopMessage` 增加 `reasoningContent`，编排一次 push 正文+思考；读取旧会话时将 `kind:'reasoning'` 合并进同角色 summary。UI：正文气泡在上、可折叠思考在下；流式 `AgentProgressStream` 嵌在当前发言角色消息卡片内。`roleProps` 员工角色仅用 users.json；未绑定则编排跳过。用户消息 push 去重，保证多轮澄清均保留。
- **相对选定提案的变更：** 增加严格绑定与 `getWorkshopSession` 迁移。
- **关键变更：** `workshop-types.ts`、`workshop-orchestrator.ts`、`workshop-store.ts`、`workshop-user-bind.ts`（主进程）、`workshop-ipc.ts`、`WorkshopMessageItem.vue`、`WorkshopPane.vue`、`axecoder.d.ts`、单测。
- **权衡：** 历史 JSON 需迁移函数；严格模式可能跳过部分角色需 UI 提示。
- **验证：** 编排单测复合字段；用户条数；手工 Agent 流嵌套。
- **待解决问题：** 无。

### 未采纳方案说明

- **未选：** 提案 2 — 用户选定复合消息以保障持久化一致。
