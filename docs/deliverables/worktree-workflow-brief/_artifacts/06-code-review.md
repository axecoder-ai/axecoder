# 代码审查 — worktree-workflow-brief

## 范围

对照已确认方案与计划，审查 Worktree / Workflow / Brief 真实现。

## 功能对照

| 项 | 结论 |
|----|------|
| EnterWorktree 检测 + 创建 + ctx 切换 | ✅ |
| ExitWorktree 恢复 + remove best-effort | ✅ |
| Workflow playbook 加载优先级 | ✅ |
| Brief ask_pending | ✅ |
| feature flag 门控 | ✅ |

## 质量

- **优点：** 模块边界清晰；复用 `runGit`、skill/command 加载、现有 Ask UI；单测 mock git。
- **非阻塞：** IDE 工作区不同步；Brief 依赖「其他」填写；`ensureWorktreesIgnored` 会直接改 `.gitignore` 未 commit（与 skill 一致）。
- **安全：** worktree 路径限定在 `.worktrees/<branch>`；无路径穿越。

## 阻塞项

无。

## 结论

**通过。** 可按 feature flag 灰度开启。
