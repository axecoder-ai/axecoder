---
任务名: user-skills
完成日期: 2026-06-04
选定方案: 提案 1 — users.json 内嵌 Skill 名列表 + 设置页多选 + Workshop prompt 注入
审查结论: 通过
单测全绿: 是（279/279）
---

# user-skills 交付总结

## 1. 概述

**需求：** 在 Users 个人档案（头像、姓名、角色、擅长领域）之外，为每个用户配置可执行的 Skill/命令列表。

**本轮目标：** 设置页多选持久化；Workshop 成员发言时注入绑定 Skill 指引。

**选型：** 推荐并选定提案 1；无额外调整。

**交付物目录：** `docs/deliverables/user-skills/`，过程文档见 `_artifacts/`。

---

## 2. 方案

**状态：** 已确认

- `UserEntry.skillSlugs: string[]` 写入 `~/.axecoder/users.json`
- IPC `users:listAvailableSkills` 聚合 Skill + 自定义命令
- Workshop `member` / `execute` 模式：`resolveUserSkillPromptBlock` 拼入 task prompt
- 内置技术经理：role/expertise 仍锁定；skillSlugs 可配置

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 核心 | users.json 内嵌 + prompt 注入 | 独立文件 + 工具过滤 |
| 工作量 | 小 | 大 |

**用户选择：** 提案 1，无额外调整。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

1. users-store / workshop-user-skills 单测（TDD）
2. types、store、ipc、workshop 模块
3. UserFormDialog 多选 UI
4. 全量单测

详见 `_artifacts/plan-user-skills.md`。

---

## 5. 实现说明

- 设置 → Users → Edit：新增 **Skills / Commands** checkbox 列表
- 保存时 `skillSlugs` 小写写入 users.json
- `enrichRoleSpeakInputWithSkills` 在 agent/subagent speaker 调用前注入

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

- 命令：`npm test`
- 结果：**64 文件 / 279 用例全绿**
- 本轮新增：6 用例（`UT-user-skills/`）

详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 单元测试：全绿
- 手工/集成：设置页勾选 → Workshop 成员 prompt 含 Skill 块 — **待补充**

---

## 8. 代码审查

- **结论：通过**
- 无阻塞项；非阻塞：列表 Skill 数量徽章、discover 缓存、E2E 验证

详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/users-types.ts` | 修改 | skillSlugs 类型 |
| `electron/main/users-store.ts` | 修改 | 持久化 skillSlugs |
| `electron/main/users-available-skills.ts` | 新增 | 可选列表聚合 |
| `electron/main/users-ipc.ts` | 修改 | listAvailableSkills IPC |
| `electron/main/workshop/workshop-user-skills.ts` | 新增 | prompt 解析 |
| `electron/main/workshop/workshop-types.ts` | 修改 | skillPromptBlock |
| `electron/main/workshop/workshop-subagent-speaker.ts` | 修改 | 注入 + enrich |
| `electron/main/workshop/workshop-agent-speaker.ts` | 修改 | enrich |
| `electron/preload/index.ts` | 修改 | API 暴露 |
| `src/types/axecoder.d.ts` | 修改 | 类型 |
| `src/components/workbench/UserFormDialog.vue` | 修改 | Skill 多选 UI |
| `src/components/workbench/UsersTab.vue` | 修改 | 保存 skillSlugs |
| `tests/unittest/UT-user-skills/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

- Skill 仅 prompt 生效，未做工具白名单过滤
- slug 重命名后 UI 不显示缺失项（保留原 slug 值）
- Users 列表 Skill 数量展示（可选增强）
- Workshop 重做落地后可再验证路由场景

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 选型记录 | `_artifacts/02-selection.md` |
| 双方案/已确认方案 | `_artifacts/proposal-user-skills.md` |
| 实施计划 | `_artifacts/plan-user-skills.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测报告 | `_artifacts/05-unittest.md` |
| 代码审查 | `_artifacts/06-code-review.md` |
