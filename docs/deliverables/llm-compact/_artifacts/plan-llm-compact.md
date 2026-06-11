# LLM 摘要式 compact 设计文档

**desired_location:** `docs/plans/plan-llm-compact.md`

## 当前背景

- `compactAgentMessages` 仅规则截断，摘要为丢弃条数统计。
- 自动 compact 在 `prepareSessionBeforeModel` 超 `agentContextCompactThreshold` 时触发。
- Claude Code `/compact` 为 LLM 摘要；矩阵 P10 待补齐。

## 需求

### 功能需求

- 丢弃的中间消息经 LLM 生成可读摘要，注入 `<system-reminder>`。
- LLM 失败时回退规则摘要。
- 使用 session 模型 fast API 档。
- Agent 自动 compact + `agent:compactMessages` IPC。

### 非功能需求

- 摘要输入截断（单条 tool、总 transcript 上限）。
- 摘要输出上限 ~8000 字符。
- metrics source: `agent`。

## 实施计划

### 阶段一：摘要核心

1. `serializeMessagesForCompact`、`summarizeDroppedWithLlm`、`compactAgentMessagesWithLlm`
2. 保留同步 `compactAgentMessages` 作规则回退

### 阶段二：接入

3. `prepareSessionBeforeModel` 改 async LLM compact
4. `agent:compactMessages` 接受 `modelId`/`sessionId`

### 阶段三：测试

5. UT mock `chatWithProvider`：成功摘要、失败回退
6. `npm test` 全绿

## 测试策略

- vitest mock models-store、secrets-store、chat-with-provider、config-store
- 回归现有 `compactAgentMessages` 保留尾部用例

## 安全考量

- 摘要 prompt 不含密钥；transcript 来自会话消息本身
