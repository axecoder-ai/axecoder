# settings-users 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | settings-users |
| 完成日期 | 2026-06-02 |
| 选定方案 | 提案 1 – users.json + 头像目录 + UsersTab |
| 审查结论 | 通过 |
| 单测 | 全绿（189/189） |

---

## 1. 概述

在 AxeCoder 设置中新增 **Users** 页签，将协作成员档案（头像、姓名、角色、擅长领域）存于 `~/.aex-coder`；内置 **技术经理** 角色锁定，仅可改昵称与头像。

**选型：** 推荐并选定提案 1（独立 `users.json`，对齐 Models 存储范式）。

**交付物目录：** `docs/deliverables/settings-users/`，过程稿见 `_artifacts/`。

---

## 2. 方案

- **存储：** `~/.aex-coder/users.json` + `user-avatars/`
- **内置用户：** `builtin-manager`，`role` 固定「技术经理」，`isBuiltin` 不可删
- **IPC：** `users:list` / `save` / `delete` / `pickAvatar` / `getAvatarDataUrl`
- **UI：** `SettingsPanel` → Users → `UsersTab` + `UserFormDialog`

---

## 3. 方案选型过程

用户选定 **提案 1**，调整说明：无。对比摘要见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

分三阶段：单测 → store/IPC → UI 接入。全文见 `_artifacts/plan-settings-users.md`。

---

## 5. 实现说明

- 主进程 `users-store` 负责种子、内置约束、头像复制
- 设置页列表/表单与 Models 交互一致
- 详见 `_artifacts/05-implement-report.md`

---

## 6. 单元测试执行情况

- 命令：`npm test`
- 结果：41 文件、189 用例全部通过
- 专项：`UT-settings-users/users-store.test.ts` 4 例
- 详情：`_artifacts/05-unittest.md`

---

## 7. 测试报告

- **自动化：** 全绿
- **手工（建议）：** 设置 → Users → 编辑技术经理昵称/头像 → 添加普通用户 → 删除 → 重启应用验证持久化

---

## 8. 代码审查

- **结论：** 通过，无阻塞项
- **待办：** Workshop 读取 Users、头像大小限制
- 全文：`_artifacts/06-code-review.md`

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/users-*.ts` | 新增 | 类型、存储、IPC |
| `electron/main/index.ts` | 修改 | 注册 users IPC |
| `electron/preload/index.ts` | 修改 | 暴露 API |
| `src/types/axecoder.d.ts` | 修改 | 类型定义 |
| `src/components/workbench/SettingsPanel.vue` | 修改 | Users Tab |
| `src/components/workbench/UsersTab.vue` | 新增 | 用户列表 |
| `src/components/workbench/UserFormDialog.vue` | 新增 | 编辑表单 |
| `tests/unittest/UT-settings-users/*` | 新增 | store 单测 |

---

## 10. 遗留项与后续建议

1. Workshop 使用 Users 配置展示名/头像
2. 头像体积上限与孤儿文件清理
3. 可选：导出/导入 users.json

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 选型 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-settings-users.md` |
| 计划 | `_artifacts/plan-settings-users.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测记录 | `_artifacts/05-unittest.md` |
| 代码审查 | `_artifacts/06-code-review.md` |
