## 已确认解决方案提案

**状态：** 已确认

**请求：** Workshop 群聊每条消息展示头像、昵称、角色（员工左对齐，用户右对齐带头像）。

**最终方案：** `WorkshopMessageItem.vue` + `WORKSHOP_ROLE_UI` 含 `nickname` / `roleTitle` / `avatar` / `color`。

**关键变更：** `src/utils/workshop-roles.ts`、`WorkshopMessageItem.vue`、`WorkshopPane.vue`
