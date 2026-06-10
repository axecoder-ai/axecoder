## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 将矩阵「Coordinator 多 Agent」从「部分 Workshop」对齐为「已实现」。
- **调研来源：** `docs/deliverables/coordinator-multi-agent/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-coordinator-multi-agent.md`
- **选定基础：** 提案 2 – 统一 Coordinator 引擎（Workshop + Agent 共用编排层）
- **用户调整摘要：** 无额外调整

### 最终方案 – 统一 Coordinator 引擎

- **概述：** 抽取 Workshop turn 编排为 `electron/main/coordinator/` 通用引擎；Workshop IPC/UI 变为薄适配层。Agent 侧新增 `Coordinator` 工具，经同一引擎调度 `Task` 子代理（并行/串行）并汇总。修正 `multi-agent` 模式语义：仅 Workshop 多角色，不再向 Agent 会话暴露 Task/Agent stub。
- **相对选定提案的变更：** 无（与用户选择一致）。
- **关键变更：**
  - `electron/main/coordinator/coordinator-turn-engine.ts` — 自 workshop-turn-orchestrator 上移
  - `electron/main/coordinator/coordinator-agent.ts` — Agent Coordinator 工具执行
  - `electron/main/coordinator/index.ts` — 公共导出
  - `electron/main/workshop/workshop-turn-orchestrator.ts` — 重导出 coordinator 引擎
  - `electron/main/agent/tool-executor.ts` — 注册 Coordinator
  - `electron/main/agent/agent-types.ts` / `agent-tool-prompts-ext.ts` — 工具 schema
  - `electron/main/agent/chat-mode.ts` — multi-agent 语义修正
  - `docs/research/research-agent-tools-matrix.md` — AxeCoder Coordinator → 已实现
- **权衡：** 编排逻辑单点维护；Workshop 与 Agent composer UI 仍分离但共享后端引擎；TeamCreate 动态建队留后续。
- **验证：** 既有 `UT-collab-workshop` 全绿；新增 `UT-coordinator-multi-agent` 测 Coordinator 并行/串行；手工 Multi-Agent Workshop + Agent Coordinator 各跑一轮。
- **待解决问题：** bugbot/security-review、best-of-n worktree 深度整合仍为独立 rppit；统一 composer UI 留二期。

### 未采纳方案说明

- **未选：** 提案 1 – Agent 侧 Coordinator 工具 + Workshop 语义修正
- **原因：** 用户选定提案 2，优先架构统一而非最小 diff。
