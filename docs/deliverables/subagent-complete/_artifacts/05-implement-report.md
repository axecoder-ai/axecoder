# 功能实现报告 — subagent-complete

## 功能说明

补齐 Subagent 全链路：

1. **发现与存储**：`electron/main/subagents/` 扫描 `~/.cursor/agents` 与项目 `.cursor/agents/*.md`（Cursor frontmatter）
2. **运行时**：`resolveSubagentForExecution` 自定义代理优先于内置同名；注入 body 为 prompt 前缀；`readonly`/`model`/`is_background` 生效
3. **Task 工具**：`subagent_type` 改为 string；后台任务尊重 `is_background` 默认
4. **System prompt**：委派段列出项目自定义 subagent 名称
5. **Settings UI**：`RulesSkillsTab` Subagents 列表 + `SubagentFormDialog` CRUD；内置类型只读展示

## 修改文件列表

| 文件 | 说明 |
|------|------|
| `electron/main/subagents/*` | 新增 types/parse/store/ipc |
| `electron/main/agent/agent-custom-subagents.ts` | 运行时解析 |
| `electron/main/agent/agent-subagent.ts` | 自定义配置注入 |
| `electron/main/agent/tool-executor.ts` | Task 分支 |
| `electron/main/agent/agent-subagent-types.ts` | `isBuiltinSubagentType` |
| `electron/main/agent/agent-tool-prompts.ts` | Task schema |
| `electron/main/agent/agent-system-prompt.ts` | 自定义 agents 列表 |
| `electron/main/index.ts` | 注册 IPC |
| `electron/preload/index.ts`、`src/types/axecoder.d.ts` | API |
| `src/components/workbench/SubagentFormDialog.vue` | 新建 |
| `src/components/workbench/RulesSkillsTab.vue` | Subagents UI |
| `tests/unittest/UT-subagent-complete/` | 单测 |
| 若干测试 | worktree mock 修正、system prompt 超时调整 |

## 注意事项

- 自定义与内置同名时**自定义优先**
- `resume:"self"`、多模态 `file_attachments` 仍遗留
- `buildAgentSystemPrompt` 因扫描 agents 目录略慢（~6–9s 冷启动）
