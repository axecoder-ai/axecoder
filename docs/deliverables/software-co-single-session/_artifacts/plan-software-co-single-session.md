# Software Co. 单 Session 软 SOP — 实施计划

**状态：** 待实施  
**关联提案：** `docs/proposals/proposal-software-co-single-session.md`  
**slug：** `software-co-single-session`

## 当前背景

- Software Co. 与 Agent 共用 `runAgentLoopUntilDoneOrPending`，但 `sop-pipeline-engine` 硬拆多阶段、多 session，效率远低于 Agent。
- 用户选定：默认 Fast 单 session；严格流水线保留为 `AXECODER_SOP_STRICT=1`。

## 需求

### 功能需求

1. `software-company` 默认走 `sendSopFastPipelineMessage`（单 session、工具全开）
2. 软 SOP prompt：绿场按需写 PRD/设计/任务；增量跳过前期 artifact
3. `AXECODER_SOP_STRICT=1` 时仍走原 `sendSopPipelineMessage`
4. done 后追问复用现有 `runSopUserFollowUp` 逻辑

### 非功能需求

- Agent / Multi-Agent / 严格 SOP 零回归
- 单测全绿

## 设计决策

### 1. 编排

Fast 路径：Developer 单角色 lead，`reuseImplementSession: true`，session key `u-{devId}-sop-fast`。

### 2. Agent 循环

`runWorkshopRoleAgentTurn` 增加 `sopFast`：`chatMode: software-company`，不调用 `filterToolsForSopRole`。

## 实施计划

1. **sop-fast-pipeline + prompts** — 新建 fast 入口与软 SOP block
2. **agent-loop + chat-mode** — sopFast 选项与 addon 文案
3. **workshop-ipc + index** — 分支与导出
4. **单测** — UT-sop-fast-pipeline；UT-sop-pipeline 加 strict 守卫

## 测试策略

- `UT-sop-fast-pipeline`：mock speaker 一次调用即 done
- `UT-sop-pipeline`：beforeEach 设 `AXECODER_SOP_STRICT=1` 或测试内显式 strict
- 回归 `UT-workshop-agent-parity`

## 文件变更

- `electron/main/sop/sop-fast-pipeline.ts`（新增）
- `electron/main/sop/sop-prompts.ts`
- `electron/main/sop/index.ts`
- `electron/main/agent/agent-loop.ts`
- `electron/main/agent/chat-mode.ts`
- `electron/main/workshop-ipc.ts`
- `tests/unittest/UT-sop-fast-pipeline/sop-fast-pipeline.test.ts`（新增）
- `tests/unittest/UT-sop-pipeline/sop-pipeline.test.ts`（strict 标记）
