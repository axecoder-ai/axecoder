## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 为 AxeCoder Agent 增加运行时防呆（loop guard），拦截重复失败与重复写操作空转。
- **调研来源：** `docs/deliverables/agent-loop-guard/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-agent-loop-guard.md`（双方案草稿）
- **选定基础：** 提案 2 – 可配置 guard 服务 + 进度通知 + 步数上限
- **用户调整摘要：** 无额外调整

### 最终方案 – 可配置 Loop Guard 服务

- **概述：** 新增 `agent-loop-guard.ts`，提供 storm breaker（同错连续失败）与 repeat guard（写操作同参重复成功）。状态挂 `StoredAgentSession.loopGuard`；配置项控制开关与阈值；`emitAgentProgress` 发 `loop_guard` 事件；主循环与子代理均接入；`agentMaxToolRounds`（0=无限）作为硬顶。
- **关键变更：** `agent-loop-guard.ts`、`agent-loop.ts`、`agent-subagent.ts`、`agent-session-store.ts`、`config-store.ts`、`models-types.ts`、`agent-progress.ts`、`ChatPane.vue`、`GeneralTab.vue`、i18n、单测。
- **验证：** `UT-agent-loop-guard` 单测全绿；主进程相关测试通过。
