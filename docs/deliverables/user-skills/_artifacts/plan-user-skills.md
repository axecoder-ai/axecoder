# User Skill 列表

**desired_location:** `docs/plans/plan-user-skills.md`

## 当前背景

- Users 已有 `displayName`、`role`、`expertise`、`avatarPath`（`users.json`）。
- Agent 侧已有 Skill 发现（`agent-skills.ts`）与自定义命令发现（`agent-custom-commands.ts`），IPC：`agent:listSkills`、`agent:listCustomCommands`。
- Workshop 成员发言由 `buildRoleTaskPrompt` 构建任务 prompt，尚未注入 per-user Skill。

## 需求

### 功能需求（P0）

- `UserEntry` 增加 `skillSlugs: string[]`（可选，缺省 `[]`）。
- 设置页编辑用户时可多选 Skill/自定义命令。
- 保存/读取经 `users-store` 持久化。
- Workshop `speakMode: member` 时，将绑定 Skill 正文注入 prompt。

### 非功能需求

- 复用现有发现逻辑，不新增扫描路径。
- 单测覆盖 store 与 prompt 解析。

## 设计决策

### 1. 存储

`skillSlugs` 内嵌 `users.json`，与 `settings-users` 一致。

### 2. 可选列表来源

`users:listAvailableSkills(projectRoot)` 合并 `discoverSkills` + `discoverCustomCommands`，返回 `{ slug, label, kind, source }`。

### 3. 运行时

新建 `resolveUserSkillPromptBlock(user, projectRoot)` 读取各 slug 正文，拼接为中文指引段；`buildRoleTaskPrompt` 在 member 模式 append。

## 技术设计

### 文件变更

| 路径 | 说明 |
|------|------|
| `electron/main/users-types.ts` | 类型 |
| `electron/main/users-store.ts` | 持久化 |
| `electron/main/users-ipc.ts` | listAvailableSkills |
| `electron/main/workshop/workshop-user-skills.ts` | prompt 块 |
| `electron/main/workshop/workshop-subagent-speaker.ts` | 注入 |
| `electron/main/index.ts` | IPC 注册（若需） |
| `electron/preload/index.ts` | API |
| `src/types/axecoder.d.ts` | 类型 |
| `src/components/workbench/UserFormDialog.vue` | UI |
| `tests/unittest/UT-user-skills/` | 单测 |

## 实施计划

1. 编写 `users-store` skillSlugs 单测（红）。
2. 编写 `resolveUserSkillPromptBlock` 单测（红）。
3. 实现 types、store、ipc、workshop 模块。
4. 实现 UserFormDialog 多选 UI。
5. 跑 `npm test`，落盘实现与审查报告。

## 测试策略

- `users-store`：保存/读取 skillSlugs；内置经理保留 role 同时更新 skillSlugs。
- `workshop-user-skills`：有 slug 时输出含标题；无 slug 空串；无效 slug 跳过。
