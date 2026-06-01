# Collab Workshop（提案 1）设计文档

> 依据：`docs/proposals/proposal-collab-workshop.md`（已确认）  
> **范围：** V1 最小闭环 — 存储、编排、UI 入口、四角色+系统确认、用户澄清、文件 chip。  
> **不在范围：** 自动写盘、真多人联网、Agents 侧栏合并列表。

## 当前背景

- Agent/Chat 使用 `.axecoder/sessions/` 与 `ChatPane`。
- 需独立 `.axecoder/workshops/` 与 `WorkshopPane`，TitleBar 图标切换中央工作区。

## 需求

### 功能需求（P0）

- W1：`workshop:*` IPC — list/get/save/delete、`workshop:startRun`、`workshop:sendUserAnswer`、`workshop:advance`（单步，可选）。
- W2：编排：`manager` →（可选 `waiting_user`）→ `backend` → `frontend` → `tester`；每员工后插入 `system` 确认气泡。
- W3：`workshop:progress` 事件：`thinking` / `speaking` / `done`。
- W4：UI — 头像、气泡、思考动画、顶栏文件 chips、点击打开编辑器。
- W5：TitleBar Workshop 图标；`App.vue` 中央显示 `WorkshopPane`，与 Chat 入口独立。

### 非功能需求

- 原子写会话文件；`projectRoot` 校验与 chat-store 一致。
- 单测可注入 `RoleSpeaker`，不依赖真实 API。

## 设计决策

### 1. 存储布局

```
<project>/.axecoder/workshops/
  index.json
  <workshopId>.json
```

### 2. 编排

- `WorkshopPhase`: `idle | manager | backend | frontend | tester | waiting_user | done`
- `startRun` 一次性跑完至 `waiting_user` 或 `done`（V1）；`sendUserAnswer` 后从当前角色继续。
- 默认 `scriptedRoleSpeaker` 用于单测；运行时 `llmRoleSpeaker` 调 `chatWithProvider`。

### 3. 写盘

- V1：仅 `relatedFiles: string[]`，不调用 Edit/Write。

## 技术设计

### 核心类型（`workshop-types.ts`）

- `WorkshopSession`, `WorkshopMessage`, `WorkshopRoleId`, `WorkshopProgressPayload`

### 文件变更

| 文件 | 操作 |
|------|------|
| `electron/main/project-axecoder-dir.ts` | 扩展 workshops 路径 |
| `electron/main/workshop/*.ts` | 新建 |
| `electron/main/workshop-ipc.ts` | 新建 |
| `electron/main/index.ts` | 注册 IPC |
| `electron/preload/index.ts` | 暴露 API |
| `src/types/axecoder.d.ts` | 类型 |
| `src/components/workbench/WorkshopPane.vue` | 新建 |
| `src/components/workbench/TitleBar.vue` | 图标 |
| `src/App.vue` | 模式切换 |
| `tests/unittest/UT-collab-workshop/*.test.ts` | 新建 |

## 实施计划

1. **阶段一：** `workshop-store` + 路径辅助 + 单测  
2. **阶段二：** `workshop-orchestrator` + `workshop-ipc` + 单测  
3. **阶段三：** Preload/类型 + `WorkshopPane` + TitleBar/App  
4. **阶段四：** 手工验收清单

## 测试策略

- `UT-collab-workshop/workshop-store.test.ts` — CRUD、非法 root
- `UT-collab-workshop/workshop-orchestrator.test.ts` — 全流程、澄清挂起恢复

## 安全考量

- 会话 ID 白名单；路径 `isPathInsideRoot`；不向 Renderer 暴露 API Key。

## 参考资料

- `docs/proposals/proposal-collab-workshop.md`
- `electron/main/chat-store.ts`
