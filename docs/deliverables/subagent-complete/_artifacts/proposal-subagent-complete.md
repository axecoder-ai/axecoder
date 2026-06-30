**状态：** 已确认

## 已确认解决方案提案

**上下文：**
- **请求：** 完成 AxeCoder Subagent 功能（自定义 agents 发现/运行时/CRUD UI）。
- **调研来源：** `docs/deliverables/agent-subagent-parity/`；`agent-subagent-types.ts`；`agent-skills.ts`；`RulesSkillsTab.vue`
- **上游提案：** `docs/proposals/proposal-subagent-complete.md`（双方案草稿）
- **选定基础：** 提案 1 – 自定义 Agents 全链路
- **用户调整摘要：** 无

### 最终方案 – 自定义 Agents 全链路

- **概述：** 新增 `subagents/` 模块（对齐 `skills/`）：扫描 `~/.cursor/agents` 与项目 `.cursor/agents` 的 `*.md`；运行时 `Task(subagent_type)` 优先匹配自定义定义（同名覆盖内置），注入 body 为 prompt 前缀、frontmatter 控制 readonly/model；Settings Subagents Tab 提供列表 + CRUD；Task schema `subagent_type` 改为 string；system prompt 列出可用自定义代理。
- **关键变更：**
  - `electron/main/subagents/*`（types/parse/store/ipc）
  - `electron/main/agent/agent-custom-subagents.ts`
  - `agent-subagent-types.ts`、`agent-subagent.ts`、`tool-executor.ts`
  - `agent-system-prompt.ts`、`agent-tool-prompts.ts`
  - `RulesSkillsTab.vue`、`SubagentFormDialog.vue`
  - `tests/unittest/UT-subagent-complete/`
- **权衡：** 与 Skills 对称，维护成本低；自定义与内置同名时**自定义优先**。
- **验证：** 单测 + 手工 Task 调用 `research-codebase`；Settings 新建/编辑/删除。
- **待解决问题：** `resume:"self"`、多模态 attachments 仍遗留；`is_background` 仅作 UI 提示，不自动改 Task 默认。

### 未采纳方案说明

- **未选：** 提案 2 – 最小兼容
- **原因：** 用户选定全链路 CRUD。
