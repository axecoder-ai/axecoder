# 代码审查

## 结论

**通过** — 功能符合已确认方案，单测全绿，无阻塞项。

## 功能

- [x] LLM 摘要路径与规则回退均覆盖
- [x] 自动 compact 与 IPC 一致使用 `compactAgentMessagesWithLlm`
- [x] fast tier 降低摘要成本
- [x] transcript / 输出长度上限防爆炸

## 质量

- [x] 复用现有 `chatWithProvider`，改动面小
- [x] 保留同步 `compactAgentMessages` 供回退与 UT 回归
- [x] 新增 UT mock 完整

## 安全

- [x] 无新密钥存储；摘要仅处理会话已有消息
- [x] 输入截断降低 prompt 注入面（会话内容本身可信边界内）

## 非阻塞待办（P2）

1. 统一 Renderer `/compact` 为 LLM 摘要
2. Settings 增加 `agentCompactMode: llm | rule` 开关
3. 自动 compact 防抖（避免连续 turn 重复摘要）
4. 更新 `research-agent-tools-matrix.md` §12 compact 行
