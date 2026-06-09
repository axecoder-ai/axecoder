# 方案选型记录

## 2a 选型摘要

### 一句话需求回顾

Agent 在 Thinking 阶段长时间无可见输出，用户感觉卡住；需要在聊天进度区实时展示模型 reasoning 流与工具步骤摘要（参考 Trace 多轮语义），并覆盖 Workshop 模式。

### 方案对比表

| 维度 | 提案 1 最小闭环 | 提案 2 Trace 桥接 |
|------|----------------|-------------------|
| 核心思路 | 修通已有 thinking_delta IPC + agentStore，工具步骤补摘要 | 将 trace 事件镜像到 agent:progress 时间线 |
| 主要改动范围 | agentStore、ChatPane、WorkshopPane、AgentProgressStream、agent-loop | ai-trace-store、新 timeline 组件、progress payload |
| 优点 | 改动小、立刻消除空窗、不依赖开 Trace | 多轮结构清晰、与 Trace 一致 |
| 缺点 / 风险 | 无 reasoning 模型仍只能看工具行 | 改动大、model 仍事后才有、逻辑重复 |
| 工作量 | 小 | 中 |
| 适合场景 | 快速落地、优先体验 | 调试向、需完整 request/response |

### 关键差异

- 提案 1 利用**已有** `thinking_delta` 管道，主要补前端 API 对接与 Workshop reasoning。
- 提案 2 需新建 trace 镜像层，model_call 仍在调用结束后才有内容。
- 提案 1 可在模型推理中**流式**出字；提案 2 单独无法解决推理中空窗。
- 两者可叠加，但本轮范围选提案 1 即可满足「不卡住」。
- Workshop 覆盖为**用户额外调整**，原提案 1 未写 Workshop，需补 agent-loop workshop 分支。

### 推荐方案

**推荐：提案 1 – 最小闭环：修通 thinking 流 + 工具步骤摘要**

理由：后端 delta 分离已完成大半，ChatPane 与 agentStore API 不匹配是当前主要 bug；改动面小、风险低，且用户额外要求 Workshop reasoning，在 agent-loop 同一处即可补齐。

### 选型提示

用户已通过选择题确认；完整双方案见 `docs/proposals/proposal-thinking-live-progress.md`。

---

## 2b 用户最终选择

- **选定提案：** 提案 1 – 最小闭环：修通 thinking 流 + 工具步骤摘要
- **调整说明：** 同时覆盖 Workshop 模式的 reasoning 流式输出

## 2c 落盘时间

2026-06-07
