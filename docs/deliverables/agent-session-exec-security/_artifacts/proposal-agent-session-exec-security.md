# 已确认方案：会话、执行与安全体验（§5）

**状态：** 已确认

**选定：** 提案 1 – V1 实用对齐（无额外调整）

## 目标

闭合 `research-axecoder-vs-claude-code.md` §5：会话 checkpoint + `/rewind`；`/resume` `/export` `/init` `/memory`；子代理后台任务 UI 与进度；Ollama Agent tools；更新调研中「并行顺序执行」表述。

## 关键变更

| 模块 | 内容 |
|------|------|
| `agent-checkpoint.ts` | 每 Agent 轮次快照 messages + 变更文件；`rewindToCheckpoint` |
| `agent-loop.ts` | 轮次前 `pushCheckpoint`；移除 Ollama 硬拒绝 |
| `agent-subagent-tasks.ts` | `listBackgroundRuns`；状态变更发 `subagent` 进度 |
| `chat-with-tools.ts` + `ollama.ts` | Ollama `/api/chat` + tools |
| `agent-ipc.ts` / preload / types | checkpoint、resume、export、memory、background tasks |
| `builtin.ts` | 新斜杠命令；`/rewind` 可执行回滚 |
| `ChatPane.vue` | 子代理任务条 |
| 单测 | `UT-agent-session-exec-security` |

## 不在范围

- Claude 级全局 checkpoint 仓库
- `/resume` 跨进程持久化 Agent 会话（仅内存中活跃 agent session 列表）

## 验证

- `vitest run tests/unittest/UT-agent-session-exec-security`
- 手工：后台 Agent → UI 列表 → `/rewind` 恢复一轮
