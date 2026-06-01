# 代码审查

## 结论

**通过**（无阻塞项）

## 功能对照

| 需求 | 状态 |
|------|------|
| §13 DEFAULT_AGENT_PROMPT + Notes | ✓ |
| AxeCoder 品牌 | ✓ |
| buildDefaultSubAgentSystemPrompt | ✓ |
| Agent 工具 + 子循环 | ✓ |
| 禁止嵌套子代理 | ✓ |
| 子代理自动 apply 写/Bash | ✓ |

## 非阻塞待办

- 子代理手测需真实 API Key（单测未覆盖 `runSubAgentTask` 端到端）。
- 后续可补 Explore/Plan 等内置子代理类型与 UI 进度。

## 安全

- 子代理仍受 `projectRoot` 路径约束；与主会话相同工具执行器。
