# Agent 模式选择器内嵌 Auto Plan 开关 — 实施计划

**desired_location:** `docs/plans/plan-agent-auto-plan-toggle.md`

## 当前背景

`agentAutoPlan` 后端与设置页已实现；UI 已合并 `auto-plan` 模式为 `agent`，但下拉内快捷开关缺失（用户截图需求）。

## 需求

### 功能需求

- Agent 行右侧 compact 开关，绑定 `agentAutoPlan`。
- 切换即时持久化，与设置页一致。
- 两处 `ChatModePickerDropdown` 实例均传入状态。

### 非功能需求

- 下拉宽度不明显增大（compact 开关）。
- 无障碍：`role="switch"`、`aria-checked`。

## 技术设计

### 文件变更

1. `src/components/workbench/SwitchToggle.vue` — `compact` prop
2. `src/components/workbench/ChatModePickerDropdown.vue` — Agent 行开关
3. `src/components/workbench/ChatPane.vue` — props/emit
4. `src/App.vue` — settings 绑定
5. `src/utils/chat-modes.ts` — 小工具函数
6. `tests/unittest/UT-agent-auto-plan-toggle/agent-auto-plan-toggle.test.ts`

## 实施计划

### 阶段一：工具与组件

1. 添加 `isAgentAutoPlanOn` / `agentAutoPlanSetting`
2. `SwitchToggle` compact 样式
3. `ChatModePickerDropdown` 内嵌开关

### 阶段二：接线

4. `ChatPane` props + handler
5. `App.vue` 双向绑定

### 阶段三：测试

6. 单测全绿
7. 手工验证同步

## 测试策略

- Vitest：`chat-modes` 工具函数
- 回归：`UT-chat-modes-ui` 现有用例
