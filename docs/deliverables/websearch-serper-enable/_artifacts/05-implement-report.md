# 功能实现报告 — WebSearch Serper 一键启用

## 功能说明

1. **Settings 一键开**：Agent 区 WebSearch 由 Switch 改为「启用网页搜索」按钮；启用后展示 Key 输入与「关闭网页搜索」；保存非空 Key 时自动写入 `agentFeatureWebSearch: true`。
2. **SERPER_API_KEY**：新增 `resolveWebSearchApiKey`，Settings Key 优先，否则读环境变量；executor 调用 WebSearch 时使用解析结果。
3. **文案**：中英文 i18n 与工具描述更新。

## 修改文件列表

| 文件 | 变更 |
|------|------|
| `electron/main/agent/agent-web.ts` | `resolveWebSearchApiKey`、错误提示 |
| `electron/main/agent/agent-ext-executor.ts` | 使用解析 Key |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 工具描述 |
| `src/components/workbench/GeneralTab.vue` | 一键开/关 UX |
| `shared/i18n/locales/en.ts` | 新文案 |
| `shared/i18n/locales/zh-CN.ts` | 新文案 |
| `tests/unittest/UT-web-search-webrun/web-search-webrun.test.ts` | env 与 executor 用例 |

## 单测覆盖

- `resolveWebSearchApiKey` Settings/env 优先级
- executor 在开关开、无 Settings Key、有 `SERPER_API_KEY` 时成功调 Serper
- 既有 WebSearch/WebRun 回归

## 注意事项

- 仍须 `agentFeatureWebSearch: true` 才执行 WebSearch；仅设 env 不会自动开开关。
- 关闭功能不删除已保存 Key，便于再次启用。
