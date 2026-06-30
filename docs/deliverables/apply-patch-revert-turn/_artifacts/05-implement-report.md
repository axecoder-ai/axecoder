# 功能实现报告

## 功能说明

1. **ApplyPatch 工具**：模型提交 unified diff（可多文件），校验后进入 pending 审批；apply 时批量写盘并记录 checkpoint。
2. **RevertTurn 工具**：`scope=file` 用逆 patch 回滚单文件；`scope=turn|all` 恢复 checkpoint 文件。
3. **turnFileChanges 细化**：每条带 `pendingId`，同文件多次修改并列展示，不再按 path 覆盖。
4. **UI 单文件 Undo**：`ChatTurnChangesBar` 每行 Undo → `agentRevertFilePatch`。
5. **并存**：`Edit` / `Write` 未改动语义。

## 修改文件列表

| 文件 | 说明 |
|------|------|
| `electron/main/agent/apply-patch.ts` | 新增：解析 unified diff、规划多文件变更 |
| `electron/main/agent/agent-revert.ts` | 新增：单文件逆 patch 回滚 |
| `electron/main/agent/agent-types.ts` | ApplyPatch、RevertTurn 工具名与类型扩展 |
| `electron/main/agent/agent-tool-aliases.ts` | apply_patch / revert_turn 别名 |
| `electron/main/agent/agent-tool-prompts.ts` | 工具定义与描述 |
| `electron/main/agent/tool-executor.ts` | 工具执行分支 |
| `electron/main/agent/agent-loop.ts` | recordTurnFileChange 条目化 |
| `electron/main/agent/agent-session-store.ts` | pendingToPublic 含 batchFiles |
| `electron/main/agent-ipc.ts` | agent:revertFilePatch |
| `electron/main/agent-worker/runner.ts` | worker revertFilePatch |
| `electron/preload/index.ts` | agentRevertFilePatch |
| `src/types/axecoder.d.ts` | 前端类型 |
| `src/components/workbench/ChatTurnChangesBar.vue` | 单文件 Undo |
| `src/components/workbench/ChatPane.vue` | undo 处理 |
| `tests/unittest/UT-apply-patch-revert-turn/apply-patch-revert.test.ts` | 单测 |

## 单测覆盖

- `planUnifiedPatch`：成功 / hunk 失败 / 空 patch
- `revertFileWithPatch`：apply 后 revert
- `executeAgentTool ApplyPatch`：空 patch 失败

## 注意事项

- 首期仅 **unified diff**，非 OpenCode `*** Begin Patch` 方言。
- ApplyPatch 多文件共一条 pending，审批为批量。
- 单文件 UI revert 依赖 turn 条目中保存的 `patchText`；磁盘内容若被手动改过可能 revert 失败。
