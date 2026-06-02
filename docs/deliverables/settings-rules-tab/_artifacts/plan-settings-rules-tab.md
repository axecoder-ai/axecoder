# 设置 — Rules, Skills, Subagents（V1：Rules）

**desired_location:** `docs/plans/plan-settings-rules-tab.md`

## 当前背景

- `SettingsPanel` 有 General / Models / Users，无 Rules。
- Agent 仅读 `AGENTS.md`/`CLAUDE.md`，未读 `.cursor/rules`。

## 需求（P0）

- 侧栏 Tab：**Rules, Skills, Subagents**
- 页头筛选：All / User / AxeCoder（项目 `.cursor/rules`）
- 开关占位：「Include third-party Plugins…」（写入 `config.json`，V1 无导入逻辑）
- Rules：列表（description 或首行）、`+ New`、编辑/删除、`Show all` 折叠
- 主进程：`rules:list/read/save/delete`；`alwaysApply` 规则注入 system prompt

## 实施计划

1. `rules-parse` + `rules-store` 单测（红）
2. store + IPC + preload + 类型
3. `RulesSkillsTab` + `RuleFormDialog` + `SettingsPanel`
4. `loadWorkspaceRulesPrompt` 接入 `buildAgentSystemPrompt`
5. `npm test` 全绿，落盘 05/06 报告

## 文件变更

| 路径 | 说明 |
|------|------|
| `electron/main/rules/rules-types.ts` | 类型 |
| `electron/main/rules/rules-parse.ts` | mdc 解析 |
| `electron/main/rules/rules-store.ts` | 读写列表 |
| `electron/main/rules/rules-ipc.ts` | IPC |
| `electron/main/agent/agent-system-prompt.ts` | 注入 |
| `src/components/workbench/RulesSkillsTab.vue` | UI |
| `src/components/workbench/RuleFormDialog.vue` | 表单 |
| `src/components/workbench/SettingsPanel.vue` | Tab |
| `tests/unittest/UT-settings-rules/` | 单测 |
