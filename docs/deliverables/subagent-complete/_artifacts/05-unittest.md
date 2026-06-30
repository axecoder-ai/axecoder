# 单元测试 — subagent-complete

## 命令

```bash
npm test
```

## 结果（2026-06-30）

```
Test Files  181 passed (181)
Tests       876 passed (876)
Duration    ~20s
```

## 新增用例

`tests/unittest/UT-subagent-complete/subagent-complete.test.ts`（6 项）：

- frontmatter 解析 / 序列化往返
- 自定义 subagent 覆盖内置名
- 未知类型回退 generalPurpose
- `isBuiltinSubagentType`
- `findCustomSubagentByName`

## 回归调整

- `UT-agent-system-prompt`、`UT-agent-glob`：`buildAgentSystemPrompt` 超时调至 15s
- `UT-agent-worktree-workflow-brief`：mock 改为 `git-run`（与 `agent-worktree.ts` 一致）

## 结论

**全绿**
