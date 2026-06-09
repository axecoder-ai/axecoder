# Agent 权限管理（界面 + JSON 配置）

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 参考 Claude Code，为 Agent 工具权限提供可视化 Settings 页与 JSON 配置编辑，支持全局与项目双层策略。
- **调研来源：** `docs/research/research-claude-code.md`、`electron/main/agent/agent-permissions.ts`、`Reasonix/internal/permission/permission.go`
- **上游提案：** `docs/proposals/proposal-agent-permissions-ui.md`（双方案草稿）
- **选定基础：** 提案 2 – 项目级 permissions.json + 规则引擎升级
- **用户调整摘要：** 选择 custom 无附加文字；按提案 2 全量实施（UI + 全局 config.json + 项目 `.axecoder/permissions.json`）

### 最终方案 – 双层规则引擎 + Permissions 设置页

- **概述：** 引入 Reasonix/Claude Code 风格规则（`ToolName`、`ToolName(glob)`、`ToolName=literal`），全局存 `~/.axecoder/config.json` 的 `agentPermission*` 字段，项目存 `<project>/.axecoder/permissions.json`；Settings 新增 Permissions 页（模式 + deny/ask/allow 三列表 + JSON 编辑器）；`/permissions` 打开该页；`resolveToolPermission` 合并双层策略并支持 Bash 等 subject 匹配。
- **相对选定提案的变更：** 无用户额外收窄；保留对 `agentAllowedTools`/`agentDisallowedTools` 的读取兼容。
- **关键变更：**
  - `electron/main/agent/agent-permission-rules.ts`（新）
  - `electron/main/project-permissions-store.ts`（新）
  - `electron/main/agent/agent-permissions.ts`（重构）
  - `electron/main/permissions-ipc.ts`（新）
  - `src/components/workbench/PermissionsTab.vue`（新）
  - `SettingsPanel.vue`、`App.vue`、`builtin.ts`、i18n、类型与 preload
- **权衡：** 功能对齐 Claude Code；回归面大于提案 1，需规则解析单测。
- **验证：** 规则解析/合并单测；Settings 改规则后 Agent Bash 行为；JSON 与 UI 双向一致。
- **待解决问题：** MCP 动态工具 subject 匹配；`agentAutoApplyWrites` 与 `acceptEdits` 并存说明。
