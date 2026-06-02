# 代码审查 — session-auto-title

## 结论

**通过**（无阻塞项）

## 功能

- 与已确认方案一致：混合占位 + 条件 LLM 刷新；非占位不覆盖。
- `persist` 后异步调用，不阻塞发送；`skipTitleSuggest` 避免递归。

## 质量

- 纯函数可单测；LLM 路径 mock 覆盖。
- fast 档（`subagent` task）控制成本。
- 生成结果若仍为占位则丢弃，避免无意义刷新。

## 安全

- 仅将会话内已有 user/assistant 文本送模型；无额外文件读取。

## 非阻塞待办

- Workshop 会话同样逻辑（后续迭代）。
- 用户手动重命名 UI。
- 可选：debounce 连续 persist 时的重复 IPC（当前有 `titleSuggestInFlight` 防并发）。
