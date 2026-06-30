# 选型记录（进行中）

## 2a 选型摘要（首轮）

见主回复对比表。推荐 **提案 1**（对齐 Claude 的软编排，而非硬 phase）。

## 2b 用户反馈（首轮）

- **方案意向：** 希望先看 同类 Agent 如何实现（非直接选提案编号）。
- **范围调整：** **仅 Chat Agent**，Workshop 本期不动。

## 同类 Agent 实现要点（补充调研）

1. **Explore**：内置 `Explore` 子代理（只读 prompt + 工具过滤 + 并行指引），主 Agent 在 `>3` 次搜索场景才被提示委派。
2. **Todo**：`AppState` 持久 + 每轮 `todo_reminder` attachment 回灌列表（非仅 TodoWrite 工具返回值）。
3. **FRC**：microcompact 保留最近结果 + system 段告知会清理；`SUMMARIZE_TOOL_RESULTS` 要求把要点写入 assistant 正文。
4. **无 Chat 级强制两阶段**；Plan Mode 是用户显式进入的另一模式。

## 2b 用户最终选择（第二轮）

- **方案：** 提案 1（Claude 对齐）— §7 Todo/Agent 指引 + 每轮 todo/scratchpad 注入 + Explore 委派提示 + FRC 说明补强
- **范围：** 仅 Chat Agent（Workshop 本期不动）
- **继续：** 确认进入 create-proposals → implement
