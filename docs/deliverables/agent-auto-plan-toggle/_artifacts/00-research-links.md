# 调研链接

- `docs/proposals/proposal-agent-auto-plan.md` — 已确认的后端 auto_plan 方案
- `docs/deliverables/agent-auto-plan/` — 上一轮 agent-auto-plan 实现交付
- `electron/main/agent/chat-mode.ts` — `shouldTriggerAutoPlanOnTurn` 与 agent 模式判定
- `electron/main/agent/agent-auto-plan.ts` — 启发式评分
- `src/components/workbench/ChatModePickerDropdown.vue` — 模式选择器（待加开关）
- `src/components/workbench/GeneralTab.vue` — 设置页已有 agentAutoPlan 开关
- `src/components/workbench/SwitchToggle.vue` — 可复用开关组件
- `tests/unittest/UT-chat-modes-ui/chat-modes-ui.test.ts` — UI 已移除独立 auto-plan 模式
