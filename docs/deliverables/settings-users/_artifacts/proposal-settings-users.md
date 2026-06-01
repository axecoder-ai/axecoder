## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 设置面板 **Users** 页签；`~/.aex-coder` 持久化用户档案（头像、姓名、角色、擅长领域）；内置 **技术经理** 不可删、不可改角色与擅长领域，可改昵称与头像；可添加其他用户。
- **调研来源：** `electron/main/axecoder-dir.ts`、`models-store.ts`、`SettingsPanel.vue`、`workshop-roles.ts`
- **上游提案：** `docs/proposals/proposal-settings-users.md`（make-proposals 双方案版）
- **选定基础：** **提案 1** — `users.json` + 头像目录 + UsersTab
- **用户调整摘要：** 无额外调整；V1 以设置 CRUD + 持久化为主，不强制 Workshop 读取 Users。

---

### 最终方案 – `users.json` + 头像目录 + UsersTab

- **概述：** 主进程 `users-store` 读写 `~/.aex-coder/users.json`，头像存 `~/.aex-coder/user-avatars/`；IPC `users:list/save/delete/pickAvatar`；`SettingsPanel` 增加 Users Tab 与表单；首次启动种子 `builtinRole: manager` 技术经理条目。
- **相对选定提案的变更：** 无（按提案 1 实施）。
- **关键变更：**
  - `electron/main/users-types.ts`、`users-store.ts`、`users-ipc.ts`
  - `electron/main/index.ts` 注册 IPC
  - `electron/preload/index.ts`、`src/types/axecoder.d.ts`
  - `src/components/workbench/SettingsPanel.vue`、`UsersTab.vue`、`UserFormDialog.vue`
- **数据约束：**
  - `isBuiltin && builtinRole === 'manager'`：禁止 delete；save 时忽略 `role`/`expertise` 变更；允许 `displayName`、`avatarPath`。
  - 普通用户：四字段均可编辑，可删除。
- **权衡：** 与 models 一致；头像需主进程落盘（dialog 或 base64 一次写入）。
- **验证：** `users-store` 单测；手工设置页全流程。
- **待解决问题：** Workshop V2 读取 Users 展示名/头像；头像大小上限。

### 未采纳方案说明

- **未选：** 提案 2（config.json 内嵌 Base64）
- **原因：** 配置膨胀、与分文件策略不一致；用户选定提案 1。
