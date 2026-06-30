# Agent 权限管理（界面 + JSON）交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | agent-permissions-ui |
| 完成日期 | 2026-06-07 |
| 选定方案 | 提案 2 – 项目级 permissions.json + 规则引擎 |
| 审查结论 | 通过 |
| 单测 | 全绿（16/16） |

---

## 1. 概述

为 AxeCoder Agent 补齐 同类 Agent 风格的权限管理：**Settings Permissions 页**可视化编辑 + **全局 config.json / 项目 permissions.json** 双文件配置。用户选定提案 2（规则引擎 + 项目级 JSON）。

交付目录：`docs/deliverables/agent-permissions-ui/`

---

## 2. 方案

- 规则优先级：deny > ask > allow > 只读工具 allow > mode fallback
- 规则格式：`ToolName`、`ToolName(glob)`、`ToolName=literal`
- 全局：`~/.axecoder/config.json` 中 `agentPermissionMode`、`agentPermissionAllowRules` 等
- 项目：`<project>/.axecoder/permissions.json`
- `/permissions` 打开设置页

---

## 3. 方案选型过程

推荐提案 1（最小改动）；**用户选定提案 2**（规则引擎 + 项目 JSON）。调整说明：custom 无附加文字。

详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

阶段：规则引擎 → IPC → PermissionsTab UI → 单测。全文见 `_artifacts/plan-agent-permissions-ui.md`。

---

## 5. 实现说明

- 新增 `agent-permission-rules.ts`、`project-permissions-store.ts`、`permissions-ipc.ts`
- 重构 `agent-permissions.ts`；`agent-loop.ts` 传入 subject 与合并策略
- 新增 `PermissionsTab.vue`；Settings 侧栏 Permissions 导航

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

```bash
npm test -- tests/unittest/UT-agent-permissions-ui tests/unittest/UT-agent-runtime-gaps
```

16 passed，0 failed。**全绿**。详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 自动化：规则解析、legacy deny、Bash subject、回归 runtime-gaps
- 手工建议：Settings 添加 `Bash(rm -rf*)` deny → Agent 执行 rm 应拒绝；`/permissions` 打开设置页；JSON 保存后 UI 刷新一致

---

## 8. 代码审查

结论：**通过**。待办：统一 `agentAutoApplyWrites` 与 `acceptEdits`。详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| electron/main/agent/agent-permission-rules.ts | 新增 | 规则解析与决策 |
| electron/main/project-permissions-store.ts | 新增 | 项目 permissions.json |
| electron/main/permissions-ipc.ts | 新增 | IPC |
| electron/main/agent/agent-permissions.ts | 修改 | 合并策略 |
| electron/main/agent/agent-loop.ts | 修改 | 运行时权限 |
| electron/main/models-types.ts | 修改 | 配置字段 |
| electron/main/config-store.ts | 修改 | 默认值与读写 |
| electron/main/index.ts | 修改 | 注册 IPC |
| electron/preload/index.ts | 修改 | 暴露 API |
| src/components/workbench/PermissionsTab.vue | 新增 | 设置 UI |
| src/components/workbench/SettingsPanel.vue | 修改 | 导航 |
| src/App.vue | 修改 | 打开 Permissions |
| src/slash-commands/builtin.ts | 修改 | /permissions |
| shared/i18n/locales/*.ts | 修改 | 文案 |
| tests/unittest/UT-agent-permissions-ui/* | 新增 | 单测 |

---

## 10. 遗留项与后续建议

1. 废弃或联动 `agentAutoApplyWrites`
2. MCP 工具 subject 规则
3. 可选：与 `.cursor/settings.json` schema 对齐

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型 | `_artifacts/02-selection.md` |
| 提案 | `_artifacts/proposal-agent-permissions-ui.md` |
| 计划 | `_artifacts/plan-agent-permissions-ui.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 审查 | `_artifacts/06-code-review.md` |
