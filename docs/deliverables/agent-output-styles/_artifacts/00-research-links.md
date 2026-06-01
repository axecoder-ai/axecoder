# 调研链接

- `claude-code/src/constants/outputStyles.ts` — `OUTPUT_STYLE_CONFIG`、`getOutputStyleConfig`、Explanatory / Learning 内置 prompt
- `claude-code/src/constants/prompts.ts` — `getOutputStyleSection`、`getSimpleIntroSection(outputStyleConfig)`、动态段 `output_style`、§15 组装与 `keepCodingInstructions`
- `claude-code/docs/claude-code-system-prompts-full.md` §12、§15
- `electron/main/agent/agent-system-prompt.ts` — 现有 `buildAgentSystemPrompt`、动态段顺序
- `electron/main/config-store.ts`、`src/components/workbench/GeneralTab.vue` — 设置持久化与 UI 模式

**调研缺口：** 不实现自定义 `~/.claude/output-styles/`、插件强制风格、MCP；与 Claude 内置两风格 + default 对齐。
