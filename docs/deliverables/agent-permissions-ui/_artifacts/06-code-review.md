# 代码审查

## 结论：**通过**（无阻塞项）

## 检查项

| 项 | 结果 |
|----|------|
| 需求覆盖（UI + 全局/项目 JSON） | ✓ |
| 规则优先级与 Reasonix 一致 | ✓ |
| 旧配置兼容 | ✓ |
| 单测全绿 | ✓ |
| 最小侵入 agent-loop | ✓（每轮预合并 policy） |

## 非阻塞待办

1. General 页 `agentAutoApplyWrites` 与 `agentPermissionMode` 统一文案与写入逻辑。
2. MCP `CallMcpTool` 的 subject 规则扩展。
3. 项目 permissions 文件首次保存时是否应 gitignore 提示。

## 风险

- 用户误设 `bypassPermissions` + 空 deny 可导致全自动执行；UI 已标注模式含义。
