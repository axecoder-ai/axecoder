# 选型记录 — user-skills

## 2a 选型摘要

### 一句话需求回顾

在现有 Users 个人档案（头像、姓名、角色、擅长领域）之外，为每个用户增加可执行的 Skill/命令列表配置；设置页可勾选，Workshop 成员 Agent 发言时按列表注入对应 Skill 指引。

### 方案对比表

| 维度 | 提案 1 `users.json 内嵌 + 多选 + prompt 注入` | 提案 2 `独立文件 + Tab 子页 + 工具过滤` |
|------|-----------------------------------------------|----------------------------------------|
| 核心思路 | `UserEntry.skillSlugs` 存 slug，设置页 checkbox，Workshop prompt 注入 Skill 正文 | 独立 `user-skills.json`，独立编辑 UI，prompt + 工具层过滤 |
| 主要改动范围 | users-types/store、UserFormDialog、workshop-subagent-speaker | 新 store/ipc、UsersTab 子页、agent 工具过滤 |
| 优点 | 改动小、复用已有发现逻辑、与 settings-users 一致 | 档案与能力解耦、可扩展工具权限 |
| 缺点 / 风险 | Skill 仅 prompt 生效，不硬性限工具；slug 改名需重选 | 实现面大、Skill→tool 映射脆弱 |
| 工作量（粗估） | 小 | 大 |
| 适合场景 | V1 快速落地、Workshop 成员差异化能力 | 后续需严格 per-user 工具白名单 |

### 关键差异说明

- 选提案 1：Skill 绑定写在 `users.json`，与现有 Users CRUD 一体，设置表单一次保存。
- 选提案 2：Skill 独立文件与 UI，适合复杂权限，但 V1 过重。
- 提案 1 运行时仅注入 prompt，不限制 Agent 工具集；提案 2 会改 subagent 工具列表。
- 两者均复用 `discoverSkills` / `discoverCustomCommands` 作为可选列表来源。

### 推荐方案

**推荐：提案 1 – `users.json` 内嵌 Skill 名列表 + 设置页多选 + Workshop prompt 注入**

理由：与已落地的 Users 存储范式一致；已有 `agent:listSkills` / `listCustomCommands` IPC 可复用；改动面可控；Workshop 重做尚未落地，prompt 注入足以验证「成员带 Skill 发言」价值。

### 选型提示

下一步通过选择题确认；完整细节见 `docs/proposals/proposal-user-skills.md`。

---

## 2b 用户最终选择

- **选定提案：** 提案 1 – `users.json` 内嵌 Skill 名列表 + 设置页多选 + Workshop prompt 注入
- **调整说明：** 无额外调整，按方案原样落地
