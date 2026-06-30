# 调研来源

- `docs/research/research-agent-tools-matrix.md` — §1 文件与编辑：`apply_patch`、`revert_turn` 能力矩阵
- `docs/proposals/proposal-chat-file-agent.md` — 刻意不采用 unified `apply_patch` 为主路径的历史决策
- `docs/plans/plan-chat-file-agent-proposal1.md` — 「不采用模型直接提交 unified apply_patch」
- `electron/main/agent/tool-executor.ts` — Edit/Write 执行与 pending diff
- `electron/main/agent/edit-utils.ts` — `applyStringReplace`、`patchToUnifiedDiff`
- `electron/main/agent/agent-checkpoint.ts` — turn 级 checkpoint（`Before turn N`）
- `electron/main/agent/agent-loop.ts` — `recordTurnFileChange`、`finalizeTurnCheckpointId`
- `src/components/workbench/ChatTurnChangesBar.vue` — 仅 Undo All / Review / dismiss
- `src/utils/patch-stats.ts` — 前端已有 `applyPatch` / `reversePatch`（diff 库）
- OpenCode 参考：`packages/opencode/src/tool/apply_patch.ts`、`packages/opencode/src/session/revert.ts`
