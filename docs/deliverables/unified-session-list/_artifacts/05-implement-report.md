# 功能实现报告 — 统一会话列表

## 功能说明

- 单注册表：`.axecoder/sessions/index.json` 条目含 `kind: agent | workshop`
- 启动时把旧 `workshops/index.json` 合并进统一 index（幂等）
- `session:listAll` IPC；Agents 侧栏展示全部会话，带「对话 / 协作」标签
- 「新建对话」「新建协作」双按钮；选中协作项在中央打开 Workshop（需无编辑器标签）
- `WorkshopPane` 移除左侧会话列表，仅保留顶栏
- **补充（2026-06-02）：** 协作占中央时右侧仍保留 Agents 统一列表（不再随 `aiPanelVisible` 一并隐藏）

## 修改文件

| 文件 | 说明 |
|------|------|
| `electron/main/session/session-types.ts` | 新建 |
| `electron/main/session/session-registry.ts` | 注册表读写与迁移 |
| `electron/main/session/session-ipc.ts` | listAll IPC |
| `electron/main/chat-store.ts` | 经 registry 写 index |
| `electron/main/workshop/workshop-store.ts` | 同上 |
| `electron/main/index.ts` | 注册 session IPC |
| `electron/preload/index.ts` | `listAllSessions` |
| `src/types/axecoder.d.ts` | `SessionListItem` / `SessionKind` |
| `src/components/workbench/AgentsPanel.vue` | 合并列表 UI |
| `src/components/workbench/WorkshopPane.vue` | 去掉侧栏列表 |
| `src/App.vue` | 按 kind 路由；协作中央时 Agents 列仍可见 |
| `tests/unittest/UT-unified-session-list/*` | 新建单测 |
| `tests/unittest/UT-collab-workshop/workshop-store.test.ts` | 断言统一 index |

## 单测覆盖

- 迁移 legacy workshops index
- agent/workshop 共存与按 kind 删除隔离

## 注意事项

- 有打开的文件标签时选协作会提示先关闭标签（Workshop 仅占中央无编辑器区域）
- Workshop 正文仍在 `workshops/{id}.json`
