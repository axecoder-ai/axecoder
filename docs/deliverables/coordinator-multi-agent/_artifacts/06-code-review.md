# 代码审查

**范围：** coordinator-multi-agent 全部变更  
**对照：** 已确认提案 2 + plan-coordinator-multi-agent

## 功能

- [x] Workshop turn 编排迁入 coordinator，re-export 保持 API 稳定
- [x] Agent Coordinator 工具并行/串行子任务
- [x] multi-agent 不再误导性暴露 Task/Agent
- [x] 矩阵标记已实现

## 质量

- [x] 单测覆盖 parse/run + workshop 回归 + chat-mode
- [x] 子代理不可递归 Coordinator（与 Task 一致）
- [x] 最小 diff：未重写 Workshop UI

## 安全

- [x] Coordinator 复用既有 runSubAgentTask 权限与 planMode 门控
- 无新增网络/文件 bypass

## 结论

**通过**

## 非阻塞待办

1. bugbot / security-review 子代理类型
2. best-of-n 与 EnterWorktree 深度整合
3. 统一 composer UI（提案 2 遗留）
