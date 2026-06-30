# 方案选型记录

## 2a 选型摘要

### 一句话需求回顾

补齐 Agent 的 `apply_patch` 与细粒度 `revert_turn` 能力：当前 Edit/Write 一次只能一处替换、回滚只能整轮 Undo All，编辑与回滚粒度过粗。

### 方案对比表

| 维度 | 提案 1 ApplyPatch + 逆 patch 栈 | 提案 2 MultiEdit + per-pending 回滚 |
|------|--------------------------------|-------------------------------------|
| 核心思路 | 新增 ApplyPatch，一次多文件多 hunk；pending 级逆 patch 回滚 | 保留 Edit/Write，MultiEdit 单文件多处；reversePatch 单文件撤销 |
| 主要改动范围 | tool-executor、apply-patch 模块、loop、checkpoint、IPC、UI | tool-executor、loop、revert 模块、IPC、UI |
| 优点 | 对齐 OpenCode/竞品；减少 tool 回合；单文件/单 pending 回滚 | 改动小；延续字符串替换心智 |
| 缺点 / 风险 | patch 方言与 prompt 成本；与历史「不用 apply_patch」决策冲突 | 无真正 apply_patch；多文件仍多轮 |
| 工作量（粗估） | 中 | 小 |
| 适合场景 | 需要竞品对齐、批量 diff 编辑 | 快速补单文件回滚、最小 diff |

### 关键差异说明

- 选提案 1：模型可一次提交完整 patch，多文件原子审批；回滚可精确到 pending/文件。
- 选提案 2：不引入新 patch 输入格式，但无法一次跨文件 patch。
- 提案 1 需选定 patch 方言（OpenCode vs unified diff）；提案 2 依赖现有 `patchText` + `reversePatch`。
- 两者均可做 UI 单文件 Undo；仅提案 1 提供 Agent 侧 `apply_patch` 工具名对齐。
- 历史 `proposal-chat-file-agent` 倾向 Edit 主路径；提案 1 需明确与 Edit/Write 并存策略。

### 推荐方案

**推荐：提案 1 – ApplyPatch 工具 + 按 pending 逆 patch 栈**

理由：用户需求明确点名 `apply_patch` / `revert_turn`；现有 `patch-stats.ts` 与 diff 库可复用；turn 级 checkpoint 与 path 覆盖是粒度粗的主因，提案 1 从数据模型上一次性解决。

### 选型提示

下一步通过选择题确认；完整细节见 `docs/proposals/proposal-apply-patch-revert-turn.md`。

---

## 2b 用户最终选择

- **选定提案：** 提案 1 – ApplyPatch 工具 + 按 pending 逆 patch 栈（对齐 OpenCode）
- **调整说明：** ApplyPatch 与 Edit/Write **并存**，本期不废弃既有编辑工具

## 2c 落盘时间

2026-06-30
