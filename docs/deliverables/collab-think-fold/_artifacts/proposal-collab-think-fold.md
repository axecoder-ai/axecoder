# 协作「先思考、后正文、思考可折叠」

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 协作中每角色先展示思考（含 Agent 工具进度流），完成后折叠思考块，再展示正式结论；避免与正文混排。
- **调研来源：** `collab-llm-role-pad` 交付总结、`workshop-orchestrator.ts`、`WorkshopPane.vue`、`AgentProgressStream.vue`
- **上游提案：** `docs/proposals/proposal-collab-think-fold.md`（双方案草稿）
- **选定基础：** 提案 2 – 仅 UI 层：运行时进度块 + 落盘拆条
- **用户调整摘要：** 无额外调整

---

### 最终方案 – 运行时进度 + reasoning 消息条落盘

- **概述：** `thinking` 阶段仅通过 `AgentProgressStream` 展示流式思考/工具进度；角色完成后将 Agent 回合内累积的 `reasoningContent` 快照为 `kind:'reasoning'` 消息（默认折叠），再 push 员工 `summary` 正文。`priorSummary` 与 API pad 逻辑跳过 reasoning 条。编排将 `speaking` 进度移到 speaker 完成之后。
- **相对选定提案的变更：** 采用 `kind:'reasoning'` 而非滥用 `system`；从 `runWorkshopRoleAgentTurn` 提取 reasoning 而非仅依赖 Renderer `streamText` 快照。
- **关键变更：**
  - `workshop-types.ts`：`WorkshopMessage.kind?`、`RoleSpeakOutput.reasoningContent?`
  - `workshop-orchestrator.ts`：thinking→speaker→speaking→push reasoning→push summary；`priorSummary` 跳过 reasoning
  - `agent-loop.ts`：`WorkshopAgentTurnResult.reasoningContent`
  - `workshop-agent-speaker.ts`：透传 reasoning
  - `WorkshopMessageItem.vue`：可折叠思考块
  - `WorkshopPane.vue`：thinking 仅进度条；避免与正文流重复
- **权衡：** 无 reasoning 的模型则无折叠块，仅正文；工具步骤仍在进度流中，不落 reasoning 条。
- **验证：** `UT-collab-workshop` 增补 reasoning 条顺序；手工四角色折叠交互。
- **待解决问题：** 是否将 tool 摘要也写入 reasoning 条（V2）。

### 未采纳方案说明

- **未选：** 提案 1 — 用户显式选择提案 2 以最小改动先交付折叠体验。
