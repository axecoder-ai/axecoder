# 实现报告

## 功能

- `agent-auto-plan.ts`：评分与 `shouldAutoPlan`
- `config.json` 字段 `agentAutoPlan`
- `startAgentTurn` 自动开启 planMode 并推送 loop_guard 提示
- 设置 → Agent → 自动计划模式
- `/auto-plan off|on`

## 改动文件

- `electron/main/agent/agent-auto-plan.ts`（新）
- `electron/main/agent/agent-loop.ts`
- `electron/main/models-types.ts`
- `electron/main/config-store.ts`
- `src/components/workbench/GeneralTab.vue`
- `src/slash-commands/builtin.ts`
- `shared/i18n/locales/{en,zh-CN}.ts`
- `tests/unittest/UT-agent-auto-plan/`
