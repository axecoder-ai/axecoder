# 实施计划：agent-session-exec-security

**desired_location:** `docs/plans/plan-agent-session-exec-security.md`

## 当前背景

§5 缺口：无 checkpoint、缺会话斜杠、子代理无 UI、Ollama 禁用；并行 tool call 已在 `agent-loop.ts` 实现。

## 需求

### 功能需求

1. Agent 每轮前写入 checkpoint；`/rewind [id]` 恢复消息与文件快照
2. `/resume` 列出内存中 agent 会话；`/export` 导出当前聊天 JSON；`/init` 写 `AGENTS.md`；`/memory` 读写 `~/.axecoder/memory.md`
3. 后台子代理状态推送 + Chat 任务列表
4. Ollama 走 OpenAI 兼容 tools 请求

### 非功能需求

- 单会话最多 20 个 checkpoint；单文件快照上限 512KB
- 不破坏现有 Agent pending 流程

## 实施计划

### 阶段一：Main 运行时

1. 新增 `agent-checkpoint.ts`，接入 `runAgentLoopUntilDoneOrPending`
2. 扩展 `agent-subagent-tasks` + `emitAgentProgress` subagent 事件
3. `agent-ipc`：checkpoint / background / memory / exportAgentSession

### 阶段二：Renderer

4. `builtin.ts` 斜杠命令
5. `ChatPane.vue` 子代理条
6. preload + `axecoder.d.ts`

### 阶段三：Ollama + 测试

7. `chatOllamaWithTools`
8. vitest + 更新 research §5 行

## 测试策略

- checkpoint push/list/rewind 单元测试
- slash 注册名存在性测试
- `listBackgroundRuns` 格式测试
