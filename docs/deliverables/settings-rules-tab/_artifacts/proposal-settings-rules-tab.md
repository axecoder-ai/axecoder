## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 设置「Rules, Skills, Subagents」页签之 **Rules** 区块；V1 含筛选与第三方导入开关占位。
- **调研来源：** `00-research-links.md`、`SettingsPanel`/`users-*` 范式
- **选定基础：** 提案 1 – `.mdc` 双源
- **用户调整摘要：** 完整 Tab 外壳（All/User/AxeCoder + 第三方导入占位）；本轮仅实现 Rules CRUD + alwaysApply 注入；Skills/Subagents 占位

### 最终方案 – `.mdc` 双源 + Rules Tab + Agent 注入

- **概述：** 用户规则 `~/.axecoder/rules/*.mdc`；项目规则 `<project>/.cursor/rules/*.mdc`。设置页 `RulesSkillsTab` 列表/筛选/新建编辑；`buildAgentSystemPrompt` 注入 `alwaysApply` 规则为 `<always_applied_workspace_rules>` 段落。
- **关键变更：** `electron/main/rules/*`、`rules-ipc`、preload 类型、`RulesSkillsTab.vue`、`RuleFormDialog.vue`、`SettingsPanel` nav、`agent-system-prompt.ts`。
- **V1 不做：** globs 路径匹配、手动 @rule、Skills/Subagents 数据、第三方配置真实导入逻辑。
- **验证：** `rules-parse`/`rules-store` 单测；设置页 CRUD；新 Agent 回合含规则片段。

### 未采纳方案说明

- **未选：** 提案 2（rules.json）— 与 Cursor 不互通。
