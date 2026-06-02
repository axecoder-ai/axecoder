# 统一会话列表 — 设计文档

> 依据：`docs/proposals/proposal-unified-session-list.md`（已确认）

## 当前背景

- Chat：`sessions/index.json` + `sessions/{id}.json`
- Workshop：`workshops/index.json` + `workshops/{id}.json`
- UI：`AgentsPanel` 仅 Chat；`WorkshopPane` 自带左侧列表

## 需求（P0）

- R1：单 index 含 `kind`；迁移旧 workshops index
- R2：`session:listAll` IPC
- R3：`AgentsPanel` 合并列表 + 类型标签 + 双新建按钮
- R4：`WorkshopPane` 去掉侧栏；`App` 按 kind 切换

## 设计决策

### 1. 存储

- 统一 index：`.axecoder/sessions/index.json`
- 正文路径不变（agent / workshop 分目录）

### 2. 类型

```ts
type SessionKind = 'agent' | 'workshop'
type SessionRegistryEntry = { id, title, updatedAt, kind }
```

## 实施计划

1. `session-registry.ts` + 单测
2. 改 `chat-store` / `workshop-store` 读写 index
3. `session-ipc` + preload + d.ts
4. `AgentsPanel` / `App` / `WorkshopPane`
5. 跑 vitest

## 测试策略

- `UT-unified-session-list/session-registry.test.ts`：迁移、按 kind 过滤、互删隔离
