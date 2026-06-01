# 设置 — Users 用户配置

**desired_location:** `docs/plans/plan-settings-users.md`

## 当前背景

- `SettingsPanel` 仅有 General / Models；协作工坊角色名写死在 `workshop-roles.ts`。
- 全局配置根目录为 `~/.aex-coder`（`axecoder-dir.ts`），`models.json` 已验证分文件 + IPC 范式。

## 需求

### 功能需求（P0）

- 设置侧栏新增 **Users** Tab。
- `~/.aex-coder/users.json` 存储用户列表；头像文件 `~/.aex-coder/user-avatars/`。
- 字段：`displayName`、`role`、`expertise`、`avatarPath`。
- 首次列出用户时种子 **技术经理**（`isBuiltin` + `builtinRole: manager`）：不可删；不可改 `role`/`expertise`；可改昵称与头像。
- 支持添加、编辑、删除普通用户；主进程选图落盘头像。

### 非功能需求

- 主进程校验内置用户规则；Renderer 禁用对应表单项。
- 单测覆盖 `users-store` 种子与内置约束。

## 设计决策

### 1. 存储

采用独立 `users.json`，对齐 `models-store`。

### 2. 头像

主进程 `dialog` 选图 → 复制到 `user-avatars/<userId>.<ext>`；Renderer 通过 `users:getAvatarDataUrl` 获取 data URL 预览。

## 技术设计

### 文件变更

| 路径 | 说明 |
|------|------|
| `electron/main/users-types.ts` | 类型 |
| `electron/main/users-store.ts` | 读写、种子、约束 |
| `electron/main/users-ipc.ts` | IPC |
| `electron/main/index.ts` | 注册 |
| `electron/preload/index.ts` | 暴露 API |
| `src/types/axecoder.d.ts` | 类型 |
| `src/components/workbench/SettingsPanel.vue` | Users Tab |
| `src/components/workbench/UsersTab.vue` | 列表 |
| `src/components/workbench/UserFormDialog.vue` | 表单 |
| `tests/unittest/UT-settings-users/users-store.test.ts` | 单测 |

## 实施计划

1. 编写 `users-store` 单测（红）。
2. 实现 store + IPC + preload 类型。
3. 实现 UsersTab / UserFormDialog，接入 SettingsPanel。
4. 跑全量 `npm test`，落盘实现与审查报告。

## 测试策略

- Vitest：`users-store` 种子、内置经理不可删、不可改 role、可改 displayName。
- 手工：设置 → Users 全流程。
