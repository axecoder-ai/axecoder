# 已确认方案：Diff 英文 + 会话级批量应用

**状态：** 已确认

**选定：** 提案 2 — 会话底栏跨消息批量 Apply all / Reject all  
**调整说明：** 无额外调整

## 目标

1. `ChatDiffCard` 单卡按钮改为 **Apply** / **Reject**。
2. 当当前聊天会话中任意消息存在 `pendingWrites` 时，在输入区上方显示固定条：**Apply all (N)** / **Reject all**，一次确认应用或拒绝该 Agent 会话内全部 pending。
3. 主进程新增 `agent:confirmAllWrites` / `agent:rejectAllWrites`，复用 `applyAllPendingInSession` 与统一拒绝逻辑。

## 关键变更

| 层级 | 文件 | 变更 |
|------|------|------|
| Main | `agent-loop.ts` | `confirmAgentAllWrites`、`rejectAgentAllWrites` |
| Main | `agent-ipc.ts` | 注册 IPC |
| Preload / 类型 | `preload/index.ts`、`axecoder.d.ts` | 暴露 API |
| UI | `ChatDiffCard.vue` | 英文按钮 |
| UI | `ChatPane.vue` | 底栏批量操作、聚合 pending 计数、完成后清理同 session 的 stale pending |
| 测试 | `tests/unittest/UT-agent-bulk/` | 批量确认/拒绝单测 |

## 验证

- 单测：`confirmAgentAllWrites` 应用全部 pending 并清空 map；`rejectAgentAllWrites` 清空并写入拒绝 tool 消息。
- 手工：Agent 一次改多文件 → 底栏 Apply all (N) → 全部落盘且 agent 继续。

## 不在范围

- 设置页 `GeneralTab` Agent 区全文英文化（可后续做）。
- `tool-executor` summary 英文化（非阻塞）。
