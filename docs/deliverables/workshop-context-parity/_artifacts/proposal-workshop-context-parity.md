## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 重构 Workshop/Multi-Agent，消除相对 Chat Agent 的明显能力差距；保持 Multi-Agent 模式即 Workshop、ChatPane 集成。
- **调研来源：** `docs/deliverables/workshop-context-parity/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-workshop-context-parity.md`（双方案草稿）
- **选定基础：** 提案 1 – 上下文对等
- **用户调整摘要：** Tech Lead 在保留 JSON 路由的前提下，增加 `runWorkshopRoleAgentTurn` 读代码能力（派活前/后可选短轮次）；图片多模态全链路透传。

### 最终方案 – Workshop 上下文对等 + Tech Lead 读码

- **概述：** 保留「Tech Lead JSON 路由 + 成员 Agent 回合」编排，加厚跨角色上下文（`priorSummary` 含实质结论与 `reasoningContent`）；成员输出不再强制仅 `Done.+路径`；路由 prompt 注入最近成员报告摘录；Tech Lead 在派活前可跑一次 **explore 型** `runWorkshopRoleAgentTurn`（只读工具）以读代码后再 JSON 派活；Multi-Agent 标签下 Workshop `modelId` 与 Agent `activeModelId` 同步；确认 `pendingUserImages` 贯穿 speaker/router。
- **相对选定提案的变更：** 新增 Tech Lead 读码回合（`speakMode: 'manager_chat'` 或等价，只读工具集）。
- **关键变更：**
  - `electron/main/workshop/workshop-display.ts`
  - `electron/main/workshop/workshop-api-messages.ts`
  - `electron/main/workshop/workshop-turn-orchestrator.ts`
  - `electron/main/workshop/workshop-subagent-speaker.ts`
  - `electron/main/workshop/workshop-router.ts`
  - `electron/main/workshop/workshop-agent-speaker.ts`
  - `electron/main/agent/agent-loop.ts`（manager_chat 只读）
  - `src/components/workbench/WorkshopChatSection.vue`、`ChatPane.vue`
- **权衡：** 改动面仍可控；Tech Lead 多读一轮增加延迟与 token；未采用统一持久 session（提案 2）。
- **验证：** 单测 priorSummary / formatMemberChatSummary；手工多角色连续改文件；带图消息各角色可见。
- **待解决问题：** 超长协作 6k 上限可后续提 compaction；提案 2 统一 session 留作二期。

### 未采纳

- **提案 2 – 统一 Workshop Agent 会话：** 改动过大，本期以最小重构交付。
