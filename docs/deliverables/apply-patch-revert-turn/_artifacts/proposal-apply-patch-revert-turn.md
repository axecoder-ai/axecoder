# 已确认解决方案提案：apply_patch / revert_turn — 细化编辑与回滚粒度

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 解决 Agent 文件编辑与回滚粒度过粗：补齐 `apply_patch`、细化 `revert_turn`；对标竞品矩阵。
- **调研来源：** `docs/deliverables/apply-patch-revert-turn/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-apply-patch-revert-turn.md`（双方案草稿）
- **选定基础：** 提案 1 – ApplyPatch 工具 + 按 pending 逆 patch 栈
- **用户调整摘要：** `ApplyPatch` 与 `Edit` / `Write` **并存**，本期不废弃既有编辑工具

---

### 现状总结

- 编辑：`Edit` 单次一处 `old_string`/`new_string` 替换；内部用 `patchToUnifiedDiff` 仅作展示。
- 回滚：turn 级 checkpoint + UI「Undo All」；`turnFileChanges` 同路径覆盖；dismiss 不回滚磁盘。
- 缺口：无 `ApplyPatch` / `RevertTurn` 工具名；无单文件回滚。

---

### 最终方案 – ApplyPatch + per-pending 逆 patch 回滚（与 Edit/Write 并存）

- **概述：** 新增 `ApplyPatch` 工具，接受 **unified diff**（支持单 patch 多文件）；解析校验后生成一条 pending（批量 apply）；`turnFileChanges` 按 `pendingId` + 文件条目化，同文件多次修改可并列展示。新增 `RevertTurn` 工具与 IPC `agentRevertFilePatch`，用 `reversePatch` 单文件回滚；`ChatTurnChangesBar` 每行增加 Undo。`Edit`/`Write`/`Delete`/`Move` 保持原样。
- **相对选定提案的变更：** 首期 patch 方言采用 **unified diff**（复用 `diff` 包 `parsePatch`/`applyPatch`），不引入 OpenCode `*** Begin Patch` 方言；明确 **不废弃** Edit/Write。
- **关键变更：**
  - `electron/main/agent/apply-patch.ts` — 解析、规划、批量应用
  - `electron/main/agent/agent-revert.ts` — 单文件逆 patch 回滚
  - `electron/main/agent/tool-executor.ts` — `ApplyPatch`、`RevertTurn`
  - `electron/main/agent/agent-types.ts` — 工具名与 `AgentTurnFileChange.pendingId`
  - `electron/main/agent/agent-tool-prompts.ts` — 工具定义与 prompt
  - `electron/main/agent/agent-loop.ts` — `recordTurnFileChange` 条目化
  - `electron/main/agent-ipc.ts`、`electron/preload/index.ts`、`src/types/axecoder.d.ts`
  - `src/components/workbench/ChatTurnChangesBar.vue`、`ChatPane.vue`
  - `tests/unittest/UT-apply-patch-revert-turn/`
- **权衡：**
  - ✅ 满足 apply_patch + 细粒度 revert；改动可复用现有 diff 基础设施
  - ⚠️ unified diff 与 OpenCode 方言不同，后续可扩展
  - ⚠️ ApplyPatch 多文件共一条 pending，审批为批量（与 OpenCode 一致）
- **验证：** 单测覆盖 patch 规划/失败/逆 patch；UI 单文件 Undo 后磁盘一致；工具注册在 `buildCoreAgentTools`
- **待解决问题：** OpenCode 方言是否二期支持；ApplyPatch 是否要求先 Read（首期：校验路径在工程内即可）

### 未采纳方案说明

- **未选：** 提案 2 – MultiEdit + per-pending 回滚
- **原因：** 用户选定提案 1；无法补齐 `apply_patch` 工具名与多文件单次 patch 体验
