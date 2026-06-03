## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 完全重做 Workshop 群聊：AI 路由接话人与话语权；技术经理代 BOSS 派活；BOSS 仅在 AskUserQuestion 澄清时介入；LLM API 中 BOSS+经理为 `user`、成员为 `assistant`；与 Agent 共用 ChatPane；Workshop 按钮进入。
- **调研来源：** `docs/proposals/requirements-workshop-redesign.md`；`docs/deliverables/workshop-redesign/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-workshop-redesign.md`（双方案草稿）
- **选定基础：** **提案 2** – 统一消息模型 + 会话 Facade
- **用户调整摘要：** **不兼容旧 Workshop 会话**——加载时清除 `stepPlan`/`currentStepIndex` 等 legacy 字段；废弃拆步/验收 phase。

### 现状总结

- 独立 `WorkshopPane` + 中央全屏布局；`workshop-orchestrator` 拆步/验收/redo 状态机复杂且未跑通。
- `session-registry` 已支持 `kind: agent | workshop`；Users、agent speaker、SSE 可复用。
- BOSS 身份在 Agent 侧用 profile，Workshop 侧未统一。

---

### 最终方案 – 统一 Facade + Turn 路由编排

- **概述：** 后端用 **`workshop-turn-orchestrator`** + **`workshop-router`** 取代旧 orchestrator：线性 turn 循环（AI 选角 → 成员 Agent 发言 → AI 路由话语权 → 经理代 BOSS 派活 → 被指成员立刻发言）。前端新增 **`useWorkbenchSession`** Facade 与 **`workshop-message-adapter`**，`ChatPane` 按 `sessionKind` 消费统一 send/load/stream；**移除 App 中央 WorkshopPane 模式**，Workshop 与 Agent 同列展示。Workshop 数据仍存 `workshops/{id}.json`；加载时 **strip legacy stepPlan**。
- **相对选定提案的变更：** 用户要求 no_legacy，旧 phase/step 字段读取后丢弃，单测不覆盖旧拆步流程。
- **关键变更：**
  - 新增 `electron/main/workshop/workshop-router.ts`
  - 新增 `electron/main/workshop/workshop-turn-orchestrator.ts`
  - 新增 `electron/main/workshop/workshop-api-messages.ts`
  - 改 `workshop-types.ts`、`workshop-subagent-speaker.ts`、`workshop-ipc.ts`、`workshop-store.ts`
  - 废弃 `workshop-orchestrator.ts` 主流程（保留 scripted 测试辅助或删除）
  - 新增 `src/composables/useWorkbenchSession.ts`
  - 新增 `src/utils/workshop-message-adapter.ts`
  - 新增 `src/components/workbench/WorkshopChatSection.vue`（从 WorkshopPane 抽取，供 ChatPane 嵌入）
  - 改 `ChatPane.vue`、`App.vue`、`electron/preload/index.ts`、`src/types/axecoder.d.ts`
- **权衡：**
  - ✅ 前端一条 Facade 链；后端编排大幅简化
  - ⚠️ ChatPane 仍增加 workshop 分支，但逻辑下沉到 composable + 子组件
  - ⚠️ 旧 workshop 会话 stepPlan 被清空（用户确认）
- **验证：**
  - 单测：router 解析、turn 循环、API role 映射、澄清挂起、manager 派活直跳
  - adapter/facade 单测
  - 手工：Workshop 按钮 → BOSS 发任务 → 多轮 → 澄清 → 结束
- **待解决问题：**
  - Workshop 模式是否隐藏 Agent slash/工具 UI（V1：隐藏）
  - stream 订阅是否合并（V1：Workshop 仍用 workshop progress + agent progress）

### 未采纳方案说明

- **未选：** 提案 1 – ChatPane 直接 kind 分支
- **原因：** 用户选定提案 2，优先前端 Facade 长期结构
