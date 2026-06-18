# Agent 模式选择器内嵌 Auto Plan 开关

**状态：** 已确认

## 背景

在聊天输入区模式选择下拉的 **Agent** 行右侧增加 **Auto Plan** 紧凑开关，绑定既有 `agentAutoPlan: off | on` 配置；与设置页、`/auto-plan` 命令共用同一数据源。

## 已确认方案

### 行为

- 仅 **Agent** 行显示 compact `SwitchToggle`；`@click.stop` 防止误选模式。
- 开/关调用 `setSettings({ agentAutoPlan: 'on' | 'off' })`。
- 设置页 `GeneralTab` 保留现有开关（同步）。
- 后端逻辑不变：`shouldTriggerAutoPlanOnTurn(chatMode === 'agent', agentAutoPlan)`。

### 改动文件

| 文件 | 说明 |
|------|------|
| `SwitchToggle.vue` | 可选 `compact` 尺寸 |
| `ChatModePickerDropdown.vue` | Agent 行内嵌开关 |
| `ChatPane.vue` | props + emit 桥接 |
| `App.vue` | 绑定 `settings.agentAutoPlan` |
| `src/utils/chat-modes.ts` | `isAgentAutoPlanOn` / `agentAutoPlanSetting` 小工具 |
| `tests/unittest/UT-agent-auto-plan-toggle/` | 单测 |

### 非目标

- 不删除设置页开关。
- 不恢复独立 `auto-plan` 聊天模式。

### 验证

- 单测：工具函数 + UI 契约。
- 手工：下拉开关与设置页同步；复杂任务 auto-plan 行为不变。
