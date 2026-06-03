## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 在 Users 个人档案之外，为每个用户配置可执行的 Skill/命令列表；设置页多选持久化；Workshop 成员发言时注入 Skill 指引。
- **调研来源：** `users-types.ts`、`agent-skills.ts`、`agent-custom-commands.ts`、`UserFormDialog.vue`、`workshop-subagent-speaker.ts`、`docs/deliverables/settings-users/`
- **上游提案：** `docs/proposals/proposal-user-skills.md`（make-proposals 双方案版）
- **选定基础：** **提案 1** — `users.json` 内嵌 Skill 名列表 + 设置页多选 + Workshop prompt 注入
- **用户调整摘要：** 无额外调整；V1 按提案 1 原样落地。

---

### 最终方案 – `users.json` 内嵌 Skill 名列表 + 设置页多选 + Workshop prompt 注入

- **概述：** `UserEntry` 增加可选 `skillSlugs: string[]`。设置页 `UserFormDialog` 展示当前项目与用户级已发现的 Skill 与自定义命令（checkbox）；保存写入 `users.json`。Workshop 成员发言时，主进程按 slug 读取 SKILL.md / command.md 正文，拼入 `buildRoleTaskPrompt` 的「绑定 Skill」段；未绑定则与现有一致。
- **相对选定提案的变更：** 无。
- **关键变更：**
  - `electron/main/users-types.ts` — `skillSlugs?: string[]`；`UserSaveInput` 同步
  - `electron/main/users-store.ts` — 读写、缺省 `[]`、普通用户与内置经理均可编辑 skillSlugs
  - `electron/main/users-ipc.ts` — `users:listAvailableSkills(projectRoot)` 聚合 skills + commands
  - `electron/preload/index.ts`、`src/types/axecoder.d.ts`
  - `src/components/workbench/UserFormDialog.vue` — Skill 多选
  - `electron/main/workshop/workshop-user-skills.ts`（新）— `resolveUserSkillPromptBlock`
  - `electron/main/workshop/workshop-subagent-speaker.ts` — 注入 prompt 块
  - 单测：`users-store`、`resolveUserSkillPromptBlock`
- **数据约束：**
  - `skillSlugs` 存小写 slug，与 `discoverSkills` / `discoverCustomCommands` 的 `name` 一致。
  - 保存时过滤掉当前不可用的 slug（静默丢弃或保留原值——V1 保留原值，UI 标记缺失）。
  - 内置技术经理：role/expertise 仍不可改；`skillSlugs` 可配置。
- **权衡：** 实现轻量；Skill 以 prompt 引导生效，不限制工具；slug 重命名后用户需重选。
- **验证：** users-store 单测；resolveUserSkillPromptBlock 单测；手工设置页勾选 + Workshop 成员 prompt 含 Skill 摘要。
- **待解决问题：** Users 列表是否展示 Skill 数量（V1 可选）；同名 Skill/command 合并展示策略。

### 未采纳方案说明

- **未选：** 提案 2（独立 `user-skills.json` + 工具层过滤）
- **原因：** V1 范围过大；用户选定提案 1。
