# 代码审查

## 结论

**通过**（无阻塞项）

## 功能

- §5 全员原文与 §15 组装顺序符合方案。
- AskUserQuestion 闭环：工具 → 暂停 → UI → IPC → 继续循环。

## 质量

- 单测覆盖 §5 关键句、组装顺序、questions 解析。
- 类型在 main/renderer 对齐。

## 非阻塞待办

- Chat 持久化是否需序列化 `pendingAsks`（会话重开）待产品确认。
- §6 `getActionsSection`、§7 `getUsingYourToolsSection` 后续对齐。
