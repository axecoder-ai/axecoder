# 代码审查报告

**审查范围：** apply_patch / revert_turn 实现（步骤 5 全部变更）  
**对照：** `docs/proposals/proposal-apply-patch-revert-turn.md`、`docs/plans/plan-apply-patch-revert-turn.md`

## 功能

| 项 | 结论 |
|----|------|
| ApplyPatch unified diff 多文件 | ✅ 通过 planUnifiedPatch + pending batch |
| RevertTurn file / turn | ✅ 通过 |
| Edit/Write 并存 | ✅ 未破坏原路径 |
| UI 单文件 Undo | ✅ agentRevertFilePatch |
| turnFileChanges 不覆盖 | ✅ push + pendingId |

## 质量

- 复用 `diff` 包，与 `patch-stats.ts` 一致。
- 路径均经 `resolvePathInProject`。
- 单测覆盖核心路径；缺多文件 ApplyPatch 集成测（非阻塞）。

## 安全

- 工程外路径拒绝；文件大小 `MAX_AGENT_FILE_BYTES` 限制。
- 无新增 secrets / 网络面。

## 阻塞项

无。

## 非阻塞待办

1. OpenCode patch 方言二期支持。
2. ApplyPatch 多文件 pending 的 UI diff 展示可拆 per-file。
3. Delete/Move 的 per-file revert 仍依赖整轮 checkpoint。

## 审查结论

**通过** — 可合并交付。
