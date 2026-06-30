# 代码审查

## 结论

**通过** — 符合已确认方案；单测全绿；无阻塞项。

## 功能

- [x] FRC 在 compact 之后执行，摘要输入含完整 tool 内容
- [x] rollingCompactSummary + priorSummary 多轮合并
- [x] Chat `/compact` 与 Agent 共用 `compactAgentMessagesWithLlm`
- [x] LLM 失败 / 无 modelId 回退规则摘要

## 质量

- [x] 最小改动：复用 llm-compact 核心，无新服务模块
- [x] `extractPriorCompactSummary` 与占位格式一致
- [x] UT 覆盖关键路径

## 安全

- [x] 摘要仅处理会话已有消息
- [x] 输出仍受 SUMMARY_OUTPUT_CAP 限制

## 非阻塞待办（P2）

1. Settings `agentCompactCooldownTurns` 防抖
2. 更新 `research-agent-tools-matrix.md` §12 compact 行
3. Agent `/compact` 经 IPC 时同步更新 rollingCompactSummary（当前仅自动 compact 写入）
