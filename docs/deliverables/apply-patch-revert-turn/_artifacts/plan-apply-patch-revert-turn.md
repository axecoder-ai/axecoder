# apply_patch / revert_turn 实施计划

## 当前背景

AxeCoder Agent 使用 `Edit`/`Write` 做字符串级编辑，checkpoint 与 UI 回滚以 turn 为单位；竞品（OpenCode、DeepSeek-TUI）已提供 `apply_patch` 与细粒度 revert。

## 需求

### 功能需求

1. **ApplyPatch 工具**：参数 `patch`（unified diff，可多文件）；校验后 pending 审批；apply 时批量写盘并 track checkpoint。
2. **RevertTurn 工具**：`file_path` + 可选 `patch` 回滚单文件；或 `scope: all` 调已有 checkpoint 恢复（封装 `restoreCheckpointFilesOnly`）。
3. **turnFileChanges 细化**：每条含 `pendingId`；同文件多条不覆盖。
4. **UI**：`ChatTurnChangesBar` 每文件 **Undo** → `agentRevertFilePatch`。
5. **并存**：不修改 Edit/Write 行为。

### 非功能需求

- 路径必须在 `projectRoot` 内；单文件 ≤ `MAX_AGENT_FILE_BYTES`。
- 单测在 `tests/unittest/UT-apply-patch-revert-turn/`。

## 设计决策

### 1. Patch 格式

采用 **unified diff**（`diff` 包），与 `edit-utils.patchToUnifiedDiff` 一致；不引入 OpenCode 方言。

### 2. 多文件 pending

一条 `ApplyPatch` tool call → 一条 pending，`batchFiles[]` 内嵌；`apply()` 原子写多文件。

### 3. 回滚

磁盘回滚用 `reversePatch` + `applyPatch`（与 `src/utils/patch-stats.ts` 同逻辑）。

## 技术设计

### 核心模块

- `planUnifiedPatch(projectRoot, patchText)` → `PlannedPatchFile[]`
- `revertFileWithPatch(projectRoot, filePath, patchText)`
- `executeAgentTool` 分支 `ApplyPatch` / `RevertTurn`

### 文件变更

| 文件 | 操作 |
|------|------|
| `electron/main/agent/apply-patch.ts` | 新增 |
| `electron/main/agent/agent-revert.ts` | 新增 |
| `electron/main/agent/agent-types.ts` | 修改 |
| `electron/main/agent/tool-executor.ts` | 修改 |
| `electron/main/agent/agent-tool-prompts.ts` | 修改 |
| `electron/main/agent/agent-loop.ts` | 修改 |
| `electron/main/agent-ipc.ts` | 修改 |
| `electron/main/agent-worker/runner.ts` | 修改 |
| `electron/preload/index.ts` | 修改 |
| `src/types/axecoder.d.ts` | 修改 |
| `src/components/workbench/ChatTurnChangesBar.vue` | 修改 |
| `src/components/workbench/ChatPane.vue` | 修改 |
| `shared/i18n/locales/en.ts`, `zh-CN.ts` | 修改（Undo 文案） |
| `tests/unittest/UT-apply-patch-revert-turn/*.test.ts` | 新增 |

## 实施计划

1. **阶段一：核心逻辑 + 单测** — `apply-patch.ts`、`agent-revert.ts`、单测全绿
2. **阶段二：Agent 工具与 loop** — tool-executor、types、prompts、recordTurnFileChange
3. **阶段三：IPC 与 UI** — preload、ChatTurnChangesBar Undo
4. **阶段四：文档与矩阵** — 可选更新 `research-agent-tools-matrix.md`

## 测试策略

- `planUnifiedPatch`：单文件、多文件、apply 失败、hunk 不匹配
- `revertFileWithPatch`：apply 后 revert 还原
- `ApplyPatch` 工具：返回 pending、`batchFiles` 长度
- `RevertTurn`：file scope 成功

## 安全考量

- 所有路径 `resolvePathInProject`；禁止工程外写入。

## 参考资料

- `docs/deliverables/apply-patch-revert-turn/_artifacts/00-research-links.md`
- OpenCode `apply_patch.ts`（参考语义，非代码拷贝）
