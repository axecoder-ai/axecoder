# Collab LLM 角色填充（提案 2）设计文档

> 依据：`docs/proposals/proposal-collab-llm-role-pad.md`（已确认）

## 当前背景

- Workshop 编排 `pushMessage` 依次写入 user、四员工、system 确认。
- 映射 API 时员工均为 `assistant`，连续员工发言会相邻；`priorSummary` 拼文本不触发 API，但未来多轮/统一会话会用到完整消息序列。

## 需求

### 功能需求

- F1：`WorkshopMessage` 支持 `hidden?: boolean`。
- F2：写入前若 API 角色与上一条有效消息相同，先插入隐藏 `user` + `continue`。
- F3：UI 不渲染 `hidden`；`priorSummary` 忽略 `hidden`。

### 非功能需求

- 不改变现有可见消息顺序语义；单测覆盖连发场景。

## 设计决策

### 1. API 角色映射

- `user` → `user`
- `manager|backend|frontend|tester` → `assistant`
- `system` → 不参与（查找上一条时跳过）

### 2. 填充策略

- 仅当 `lastApiRole === incomingApiRole` 时插入隐藏 user `continue`（提案 2 最小实现）。

## 实施计划

1. 扩展 `workshop-types.ts`
2. 修改 `workshop-orchestrator.ts` — `pushMessage` + `priorSummary`
3. `WorkshopPane.vue` 过滤 + `axecoder.d.ts`
4. 单测 `workshop-orchestrator.test.ts`
5. 跑 `UT-collab-workshop`

## 测试策略

- 模拟 speaker 连续返回：第二条员工消息前应有 hidden user continue。

## 文件变更

| 文件 | 操作 |
|------|------|
| `workshop-types.ts` | 修改 |
| `workshop-orchestrator.ts` | 修改 |
| `WorkshopPane.vue` | 修改 |
| `axecoder.d.ts` | 修改 |
| `workshop-orchestrator.test.ts` | 修改 |
