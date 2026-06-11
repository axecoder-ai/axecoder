**状态：** 已确认

## 已确认解决方案提案

**上下文：**
- **请求：** Agent 上下文 compact 升级为 LLM 摘要式，对齐 Claude Code `/compact`。
- **调研来源：** `docs/research/research-agent-tools-matrix.md` §12/§17；`agent-context-compact.ts`；`agent-loop.ts`
- **选定基础：** 提案 1 – Agent 内嵌 LLM 摘要 + 规则回退
- **用户调整摘要：** 无额外调整（用户跳过选型，采用推荐方案）

### 最终方案 – Agent 内嵌 LLM 摘要 + 规则回退

- **概述：** 在 `agent-context-compact.ts` 增加 `compactAgentMessagesWithLlm`：对被丢弃消息调用 `chatWithProvider`（fast tier、无 tools）生成摘要；失败回退规则统计摘要。`prepareSessionBeforeModel` 与 `agent:compactMessages` IPC 走异步路径。本轮不升级 Renderer `chat-compact`。
- **关键变更：** `agent-context-compact.ts`、`agent-loop.ts`、`agent-ipc.ts`、UT
- **权衡：** 自动 compact 增加一次 LLM 调用；Chat `/compact` 仍规则截断
- **验证：** mock LLM 摘要与回退 UT；`npm test` 全绿
- **待解决问题：** 后续统一 Chat `/compact`；tool 消息过长时的摘要输入截断策略调优

### 未采纳方案说明

- **未选：** 提案 2 – 独立服务 + Settings 开关
- **原因：** 优先最小改动验证 Agent 摘要质量
