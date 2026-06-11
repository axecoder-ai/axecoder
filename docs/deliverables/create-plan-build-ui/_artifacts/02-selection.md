# create_plan + Plan Build UI — 选型记录

## 一句话需求回顾

实现内置 `CreatePlan` 工具（对齐 Cursor `create_plan`），生成计划 Markdown；聊天内可 Build 执行 implement；**打开计划文件时编辑器也须有 Build 按钮**。

## 方案对比表

| 维度 | 提案 1 阻塞审批 + 聊天 Build | 提案 2 即时写文件 + 编辑器 Build |
|------|------------------------------|----------------------------------|
| 核心思路 | plan_pending 阻塞，聊天卡片 Build/Dismiss | 非阻塞写文件，主要靠编辑器 Build |
| 主要改动范围 | agent-loop pending、IPC、ChatPane、EditorPane | agent-ext-executor、EditorPane、桥接 |
| 优点 | 对齐 Cursor ACP；聊天内交互完整 | 实现量小 |
| 缺点 / 风险 | 循环与 IPC 复杂度略增 | 聊天无计划卡片；无法拒绝计划 |
| 工作量 | 中 | 小 |
| 适合场景 | 需要 Cursor 式 Plan→Build 工作流 | 快速 MVP |

## 关键差异

- 选 A：聊天内可见计划卡片，Build 前可 Dismiss；需改造 agent-loop pending。
- 选 B：无阻塞审批，主要靠编辑器 Build。
- 两方案均可写 `docs/plans/plan-*.md`。
- `/create-plan` playbook 要求聊天内 Build，仅 A 完全对齐。
- Build 均应对齐 `/implement` playbook。

## 推荐

**推荐：提案 1 – CreatePlan 阻塞审批 + 聊天内 Build**

理由：矩阵优先级 #1；SwitchMode/planMode 已就绪；`ask_pending` 可复用；与 Cursor playbook 一致。

## 用户最终选择

- **选定：提案 1 – CreatePlan 阻塞审批 + 聊天内 Build（对齐 Cursor ACP）**
- **调整说明：** 必须保留编辑器打开 plan 文件后的 Build 按钮（与聊天 Build 共用同一 IPC）
