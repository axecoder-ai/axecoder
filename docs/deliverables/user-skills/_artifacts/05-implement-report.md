# 功能实现报告 — user-skills

## 功能说明

- `UserEntry` 新增 `skillSlugs: string[]`，持久化于 `~/.axecoder/users.json`。
- 设置 → Users → 编辑用户：展示可勾选的 Skill / 自定义命令列表（来自 `discoverSkills` + `discoverCustomCommands`）。
- Workshop 成员/执行步骤发言时，主进程读取绑定 Skill 正文，注入 `buildRoleTaskPrompt` 的「绑定 Skill / 命令」段。

## 修改文件列表

| 路径 | 变更 |
|------|------|
| `electron/main/users-types.ts` | `skillSlugs`、`AvailableSkillItem` |
| `electron/main/users-store.ts` | 读写 skillSlugs |
| `electron/main/users-available-skills.ts` | 新增：聚合可选列表 |
| `electron/main/users-ipc.ts` | `users:listAvailableSkills` |
| `electron/main/workshop/workshop-user-skills.ts` | 新增：prompt 解析与 enrich |
| `electron/main/workshop/workshop-types.ts` | `skillPromptBlock` |
| `electron/main/workshop/workshop-subagent-speaker.ts` | prompt 注入 + subagent enrich |
| `electron/main/workshop/workshop-agent-speaker.ts` | agent speaker enrich |
| `electron/preload/index.ts` | `listAvailableSkills` |
| `src/types/axecoder.d.ts` | 类型与 API |
| `src/components/workbench/UserFormDialog.vue` | Skill 多选 UI |
| `src/components/workbench/UsersTab.vue` | 保存 skillSlugs |
| `tests/unittest/UT-user-skills/` | 新增单测 |

## 单测覆盖

- `users-store-skills.test.ts`：保存/读取、缺省空数组、内置经理可更新 skillSlugs
- `workshop-user-skills.test.ts`：空 slug、有效 slug 输出、无效 slug 跳过

## 注意事项

- Skill 以 prompt 注入方式生效，不限制 Agent 工具白名单。
- 可选列表依赖当前打开项目 + 用户级目录；未打开项目时仍可列出 `~/.axecoder/commands` 与用户级 skills。
- slug 统一小写存储。
