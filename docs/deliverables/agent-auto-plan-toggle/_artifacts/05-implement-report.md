# 功能实现报告

## 功能说明

在 `ChatModePickerDropdown` 的 **Agent** 行右侧增加 compact **Auto Plan** 开关，绑定 `settings.agentAutoPlan`（`on`/`off`），与设置页、`/auto-plan` 共用配置。

## 修改文件

| 文件 | 变更 |
|------|------|
| `src/components/workbench/SwitchToggle.vue` | 新增 `compact` 尺寸 |
| `src/components/workbench/ChatModePickerDropdown.vue` | Agent 行拆分布局 + 内嵌开关 |
| `src/components/workbench/ChatPane.vue` | `agentAutoPlanOn` prop + emit |
| `src/App.vue` | settings 双向绑定 |
| `src/utils/chat-modes.ts` | `isAgentAutoPlanOn` / `agentAutoPlanSetting` |
| `tests/unittest/UT-agent-auto-plan-toggle/` | 单测 |

## 注意事项

- Agent 行使用 `div + button + SwitchToggle`，避免 button 嵌套。
- 开关仅出现在 Agent 行，不改变其他模式行。
