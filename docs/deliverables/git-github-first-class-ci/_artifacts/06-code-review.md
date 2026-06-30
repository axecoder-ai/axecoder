# 代码审查

**结论：通过**

## 功能对照（方案 vs 实现）

| 项 | 状态 |
|----|------|
| GitStatus/GitDiff/GitLog 只读工具 | ✅ |
| CI forge prompt + `/investigate-ci` | ✅ |
| gh CI 只读白名单 | ✅ |
| 子代理 forge 注入 | ✅ |
| CI 仍 Bash + forgeEnvForBash | ✅ |
| 无 github_* REST 工具 | ✅ |

## 质量

- Git 工具与 Bash/gh 边界在 BASH_DESCRIPTION 与 Git* description 中写清。
- 复用 `git-ipc.runGit`，无重复 spawn 逻辑。
- RevertTurn description 补齐至 400 字下限（顺带修复既有单测失败）。

## 非阻塞待办

- `/investigate-ci` 可从 Agent session 读取 linkedPrUrl（需 IPC）。
- Gitee CI curl 模板需用户仓库验证。
- 子代理 explore 只读模式已可用 Git 工具（符合预期）。

## 阻塞项

无
