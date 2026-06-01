# 功能实现报告：settings-users

## 功能说明

- 设置面板新增 **Users** 页签，风格对齐 Models / General。
- 用户档案持久化至 `~/.aex-coder/users.json`，头像文件存 `~/.aex-coder/user-avatars/`。
- 字段：姓名（displayName）、角色（role）、擅长领域（expertise）、头像（avatarPath）。
- 首次 `listUsers` 自动种子内置 **技术经理**（`builtin-manager`）：不可删除；不可修改角色与擅长；可改昵称与头像。
- 支持添加、编辑、删除普通用户；主进程对话框选图并复制头像。

## 修改文件列表

| 路径 | 类型 |
|------|------|
| `electron/main/users-types.ts` | 新增 |
| `electron/main/users-store.ts` | 新增 |
| `electron/main/users-ipc.ts` | 新增 |
| `electron/main/index.ts` | 修改 |
| `electron/preload/index.ts` | 修改 |
| `src/types/axecoder.d.ts` | 修改 |
| `src/components/workbench/SettingsPanel.vue` | 修改 |
| `src/components/workbench/UsersTab.vue` | 新增 |
| `src/components/workbench/UserFormDialog.vue` | 新增 |
| `tests/unittest/UT-settings-users/users-store.test.ts` | 新增 |

## 单测覆盖

- 种子技术经理
- 内置不可删
- 内置 role/expertise 不可被 save 覆盖
- 普通用户增删

## 注意事项

- V1 未将 Workshop 展示名/头像改为读取 Users 配置（留 P1）。
- 新用户可在保存前选头像（`copyAvatarForUser` 不强制用户已入库，保存时写入 `avatarPath`）。
- 头像经 IPC 以 data URL 预览，体积大时仅影响设置页。
