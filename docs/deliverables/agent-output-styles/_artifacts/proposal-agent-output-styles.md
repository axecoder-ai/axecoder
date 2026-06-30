# Agent 内置输出风格

**状态：** 已确认

**选定：** 提案 2 – 后端 + General 设置下拉  
**调整：** 无

## 概述

新增 `electron/main/agent/agent-output-styles.ts`，1:1 移植 同类 Agent `OUTPUT_STYLE_CONFIG`（Default / Explanatory / Learning，含 `keepCodingInstructions: true`）。扩展 `getSimpleIntroSection(outputStyleConfig)`、`getOutputStyleSection`；`buildAgentSystemPrompt` 在 language 之后插入 output style 动态段，并按 `keepCodingInstructions` 决定是否包含 `getSimpleDoingTasksSection`。`AppConfig.agentOutputStyle` 持久化，`GeneralTab` 提供下拉，`agent-loop` 读取配置。

**不做：** 自定义 `output-styles` 目录、插件强制风格、MCP。

## 关键变更

- `electron/main/agent/agent-output-styles.ts`（新建）
- `electron/main/agent/agent-system-prompt.ts`
- `electron/main/agent/agent-loop.ts`
- `electron/main/config-store.ts`、`electron/main/models-types.ts`
- `src/types/axecoder.d.ts`、`src/components/workbench/GeneralTab.vue`、`src/composables/useWorkbench.ts`
- `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts`

## 验证

`npm test -- tests/unittest/UT-agent-system-prompt/ tests/unittest/UT-agent-glob/ tests/unittest/UT-models-settings/`
