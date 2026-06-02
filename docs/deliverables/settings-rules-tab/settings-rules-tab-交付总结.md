# settings-rules-tab 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | settings-rules-tab |
| 完成日期 | 2026-06-03 |
| 选定方案 | 提案 1 – `.mdc` 双源 + rules-store IPC |
| 审查结论 | 通过 |
| 单测 | 全绿（7/7 新增 + 既有 system-prompt 回归） |

---

## 1. 概述

**需求：** 在设置中实现 **Rules, Skills, Subagents** 页的 **Rules** 能力（对齐 Cursor 截图）：列表、筛选、新建编辑、always 规则注入 Agent。

**选型：** 提案 1；用户要求 V1 含完整 Tab 外壳（筛选 + 第三方导入占位）。

**交付物：** `docs/deliverables/settings-rules-tab/`（过程稿 `_artifacts/`）。

---

## 2. 方案

- 用户规则：`~/.axecoder/rules/*.mdc`
- 项目规则：`<project>/.cursor/rules/*.mdc`
- `alwaysApply: true` → `buildAgentSystemPrompt` 注入
- `rulesIncludeThirdPartyPlugins` 配置项（仅占位）

---

## 3. 方案选型过程

见 `_artifacts/02-selection.md`：推荐与最终均为提案 1；调整项为完整 Tab 外壳。

---

## 4. 实施计划

见 `_artifacts/plan-settings-rules-tab.md`。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

```bash
npm test -- tests/unittest/UT-settings-rules tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts
```

34 passed，0 failed。**全绿**。详情 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 自动化：parse/store/inject 过滤；system-prompt 回归。
- 手工建议：打开设置 → Rules, Skills, Subagents → 新建 User 规则 → 开 Agent 对话确认行为；打开含 `.cursor/rules` 的项目查看 AxeCoder 列表。

---

## 8. 代码审查

`_artifacts/06-code-review.md` — **通过**。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/rules/*` | 新增 | 规则存储与 IPC |
| `electron/main/agent/agent-system-prompt.ts` | 修改 | 注入 always 规则 |
| `electron/main/config-store.ts` | 修改 | 第三方导入开关配置 |
| `src/components/workbench/RulesSkillsTab.vue` | 新增 | Rules 页 UI |
| `src/components/workbench/RuleFormDialog.vue` | 新增 | 规则表单 |
| `src/components/workbench/SettingsPanel.vue` | 修改 | 新 Tab |
| `tests/unittest/UT-settings-rules/*` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

- Skills / Subagents 管理与 `/` 手动触发
- globs 路径匹配
- 第三方 Plugins 真实导入
- 用户附注「一个模型两个模型 ID」已在 `model-dual-api-id` 交付，见 `docs/deliverables/model-dual-api-id/`

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型 | `_artifacts/02-selection.md` |
| 提案 | `_artifacts/proposal-settings-rules-tab.md` |
| 计划 | `_artifacts/plan-settings-rules-tab.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 审查 | `_artifacts/06-code-review.md` |
