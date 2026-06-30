# 长会话 compact 质量 设计文档

**desired_location:** `docs/plans/plan-long-session-compact-quality.md`

## 当前背景

- `llm-compact` 已实现 Agent 自动 LLM 摘要。
- `prepareSessionBeforeModel` 先 `clearOldToolResults` 再 compact，待摘要 tool 已被占位。
- 多轮 compact 无滚动摘要字段，旧摘要随消息重摘要易失真。
- `chat:compact` / `/compact` 仍规则截断。

## 需求

### 功能需求

- 超阈值时先 LLM compact，再 FRC。
- `rollingCompactSummary` 持久于 Agent session，多轮合并。
- Chat `/compact` 使用同一 LLM 摘要器（传 modelId），失败回退规则。

### 非功能需求

- 复用 `compactAgentMessagesWithLlm`；摘要输出仍受 `SUMMARY_OUTPUT_CAP` 限制。
- 不新增 Settings UI。

## 实施计划

### 阶段一：摘要核心增强

1. `extractPriorCompactSummary`、`CompactLlmOpts.priorSummary`
2. `summarizeDroppedWithLlm` 合并 prior 进 prompt

### 阶段二：Agent 管线

3. `agent-loop` 调换顺序；更新 `rollingCompactSummary`
4. `agent-session-store` 新字段

### 阶段三：Chat 统一

5. `compactChatHistoryWithLlm` + `chat:compact` IPC
6. `builtin.ts` `/compact` 传 modelId/sessionId

### 阶段四：测试

7. `UT-long-session-compact-quality`
8. `npm test` 全绿

## 测试策略

- mock `chatWithProvider`：priorSummary 出现在 prompt
- Chat compact LLM 成功/回退
- 回归 `UT-llm-compact`

## 安全考量

- 摘要仅处理会话已有消息；无新密钥面
