# 功能实现报告

## 功能说明

1:1 对齐 Claude Code `outputStyles.ts` 内置 **Default / Explanatory / Learning**：
- 新建 `agent-output-styles.ts`（`OUTPUT_STYLE_CONFIG`、`getOutputStyleSection`、`resolveAgentOutputStyle`）
- `getSimpleIntroSection(outputStyleConfig)` — 非 default 时引用 Output Style 分支
- `buildAgentSystemPrompt` — 按 `keepCodingInstructions` 条件包含 doing tasks；动态段在 `# Language` 之后插入 `# Output Style`
- `AppConfig.agentOutputStyle` + General 设置下拉；`agent-loop` 读取配置

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/agent/agent-output-styles.ts` | 新建，内置风格英文 prompt |
| `electron/main/agent/agent-system-prompt.ts` | intro / 组装 |
| `electron/main/agent/agent-loop.ts` | 传 `outputStyleId` |
| `electron/main/config-store.ts` | 默认 `default` |
| `electron/main/models-types.ts` | 类型 |
| `electron/main/migrate-axecoder.ts` | 迁移默认 |
| `src/types/axecoder.d.ts` | Renderer 类型 |
| `src/components/workbench/GeneralTab.vue` | 下拉 UI |
| `src/composables/useWorkbench.ts` | 默认 settings |
| `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts` | 风格与组装单测 |
| `tests/unittest/UT-models-settings/config-store.test.ts` | 配置单测 |

## 未做

自定义 `output-styles` 目录、插件强制风格、MCP。

## 注意事项

- 仅**新发起**的 Agent 回合使用最新 `buildAgentSystemPrompt`（每轮 `startAgentTurn` 重建 system）。
- Explanatory/Learning 与 §10 Output efficiency 的「简短」存在张力，属 Claude 原设计。
