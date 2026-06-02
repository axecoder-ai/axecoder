# 功能实现报告 — settings-rules-tab

## 功能说明

1. **设置页 Tab**：`Rules, Skills, Subagents`（侧栏入口）；含 All / User / AxeCoder 筛选、第三方导入开关（写入 `config.json`，V1 无实际导入）。
2. **Rules 区块**：列表（默认展示 5 条 + Show all）、`+ New`、编辑/删除；对话框支持 User（`~/.axecoder/rules`）与项目（`.cursor/rules`）。
3. **Agent 注入**：`alwaysApply: true` 的规则合并进 `buildAgentSystemPrompt`（`<always_applied_workspace_rules>` 段落）。
4. **Skills / Subagents**：占位说明 + 禁用 `+ New`。

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/rules/*` | 解析、存储、IPC |
| `electron/main/agent/agent-system-prompt.ts` | 注入 always 规则 |
| `electron/main/models-types.ts` / `config-store.ts` | `rulesIncludeThirdPartyPlugins` |
| `electron/main/index.ts` | 注册 IPC |
| `electron/preload/index.ts` | API |
| `src/types/axecoder.d.ts` | 类型 |
| `src/components/workbench/RulesSkillsTab.vue` | 主 UI |
| `src/components/workbench/RuleFormDialog.vue` | 表单 |
| `src/components/workbench/SettingsPanel.vue` | Tab |
| `tests/unittest/UT-settings-rules/*` | 单测 |

## 注意事项

- 无打开项目时仅可管理 User 规则；AxeCoder 筛选会提示先打开工作区。
- `globs` 字段 V1 仅持久化，不做路径匹配。
- 项目内已有 `.cursor/rules/*.mdc` 会在列表中显示（与 Cursor 互通）。
