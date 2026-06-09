# 后台子任务 Chat 卡片 设计文档

## 当前背景

- `Task(run_in_background)` 已在 `tool-executor.ts` 异步启动子代理，`agent-subagent-tasks.ts` 维护内存 Map 并 emit `subagent` 进度
- Chat 仅在 `loading` 时通过 `AgentProgressStream` 展示子任务行；`send` 结束调用 `clearProgressUi()` 清空
- `agent:listBackgroundTasks` IPC 已存在但前端未用于消息级展示；output 文件在 `finalizeBackgroundRun` 时落盘

## 需求

### 功能需求

1. 一轮 Agent turn 内所有后台 Task 的 id 汇总到 `backgroundTaskIds`，随 assistant 消息持久化
2. 消息下展示 `BackgroundTaskCard`：description、status（running/completed/failed/stopped）
3. live 更新：SSE `subagent` + 对 running 任务每 2s `agent:resolveBackgroundTasks` 轮询
4. 重启 hydrate：Map 未命中时解析 `.axecoder/subagent-output/{taskId}.txt`
5. `applyContinueToMessage` 合并 continue 轮次新产生的 ids

### 非功能需求

- 旧会话无 `backgroundTaskIds` 不报错
- 轮询在全部终态后停止

## 设计决策

### 1. 状态 source of truth

- **live：** 内存 Map（`getBackgroundRun`）优先
- **冷启动：** output 文件解析终态
- **合并逻辑：** 抽至 `src/utils/background-task-state.ts` 便于单测

### 2. 不按 chat sessionId 过滤子任务

- 后台 run 的 `sessionId` 为 agent 临时 id（父 turn 结束后 session 已 delete）
- 卡片仅按消息上的 `backgroundTaskIds` 匹配 SSE / IPC

## 技术设计

### 数据模型

```typescript
// ChatMessage / AgentSendResult
backgroundTaskIds?: string[]

// IPC resolve 返回
type BackgroundTaskSnapshot = {
  id: string
  description: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
  outputFile?: string
  error?: string
}
```

### 文件变更

| 文件 | 操作 |
|------|------|
| `electron/main/agent/tool-executor.ts` | 扩展 `AgentContext` |
| `electron/main/agent/agent-loop.ts` | 返回 `backgroundTaskIds` |
| `electron/main/agent/agent-types.ts` | 类型扩展 |
| `electron/main/agent/agent-subagent-tasks.ts` | resolve + parse |
| `electron/main/agent-ipc.ts` | 新 handler |
| `electron/preload/index.ts` | 暴露 API |
| `src/types/axecoder.d.ts` | 前端类型 |
| `src/utils/background-task-state.ts` | 新建 |
| `src/components/workbench/BackgroundTaskCard.vue` | 新建 |
| `src/components/workbench/ChatPane.vue` | 集成 |
| `tests/unittest/UT-background-subtask-ui/` | 新建单测 |

## 实施计划

1. **后端：** context 累积 ids → loop 返回 → resolve IPC + output 解析
2. **前端 util + 单测：** merge / terminal 判定
3. **UI：** BackgroundTaskCard + ChatPane 接线
4. **回归：** `npm test` 全绿

## 测试策略

### 单元测试

- `parseTaskOutputFile` 解析 Status/Description/Error
- `resolveBackgroundTasks` Map 命中 vs 文件回退
- `mergeBackgroundTaskUpdate` SSE 合并与终态锁定

### 手工

- 3 个 background Task → 卡片实时更新 → 刷新终态保留

## 已知限制

- 重启时 running 且无 output 文件：只能显示 taskId + running，无法恢复 description
