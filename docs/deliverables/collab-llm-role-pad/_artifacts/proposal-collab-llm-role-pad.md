## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** Collab Workshop 多角色连发或连续用户澄清时，映射到 LLM API 会出现连续 `assistant`/`user`，导致接口不兼容。在编排写入消息前插入 `continue` 的隐藏 `user` 消息，保证 API 侧 user/assistant 交替；前端不展示 `hidden` 消息。
- **调研来源：** `docs/proposals/proposal-collab-workshop.md`、`electron/main/workshop/workshop-orchestrator.ts`
- **上游提案：** `docs/proposals/proposal-collab-llm-role-pad.md`（make-proposals 双方案版）
- **选定基础：** 提案 2 – 仅 Workshop 编排时插入隐藏 user 消息
- **用户调整摘要：** 无额外调整

### 最终方案 – Workshop 编排层 API 角色填充

- **概述：** 在 `workshop-orchestrator` 的 `pushMessage` 中，按「员工角色 → assistant、user → user、system 不参与」计算 API 角色；若新消息与上一条有效 API 角色相同，先插入 `{ roleId: 'user', text: 'continue', hidden: true }`，再写入真实消息。`WorkshopPane` 与 `priorSummary` 跳过 `hidden` 消息。
- **相对选定提案的变更：** 无。
- **关键变更：**
  - `electron/main/workshop/workshop-types.ts` — `WorkshopMessage.hidden?`
  - `electron/main/workshop/workshop-orchestrator.ts` — `apiRole` + pad 逻辑
  - `src/components/workbench/WorkshopPane.vue` — 列表过滤 `hidden`
  - `src/types/axecoder.d.ts` — 类型同步
  - `tests/unittest/UT-collab-workshop/workshop-orchestrator.test.ts` — 连发 pad 用例
- **权衡：**
  - ✅ 改动小，立刻消除四角色连发时的 assistant-assistant 问题。
  - ⚠️ `runWorkshopRoleAgentTurn` 单轮内 tool 链未覆盖；后续可升级到提案 1。
- **验证：** 单测模拟 manager→backend 无 pad 失败、有 pad 通过；手工四角色协作不 400。
- **待解决问题：** Agent 循环内连续 tool；Workshop 历史改为完整 `AgentLoopMessage[]` 时的出线 pad。

### 未采纳方案说明

- **未选：** 提案 1 API 出线层统一填充
- **原因：** 用户选定提案 2，优先最小改动面。
