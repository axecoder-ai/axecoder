# SwitchMode 工具 设计文档

**desired_location:** `docs/plans/plan-switch-mode-tool.md`

## 当前背景

- Cursor playbook 要求 SwitchMode；AxeCoder 仅有 EnterPlanMode/ExitPlanMode。
- ChatMode 由 Renderer 在 `agent:send` 传入，Main 未持久化；工具切换后 UI 不同步。

## 需求

### 功能需求

- SwitchMode 工具，参数 `target_mode_id`（必填）、`explanation`（可选）。
- 支持 target：agent、plan、planning、planning-only、auto-plan、reflection。
- 同步 session.planMode、session.chatMode、session.activeTools。
- agent:progress `chat_mode` 事件驱动 ChatPane 更新。

### 非功能需求

- 保留 EnterPlanMode/ExitPlanMode。
- 最小 diff；单测覆盖。

## 实施计划

### 阶段一：Main 核心

1. `chat-mode.ts` — resolveSwitchModeTarget、applySwitchModeToSession
2. `agent-session-store.ts` — chatMode 字段
3. `agent-loop.ts` — 初始化 session.chatMode

### 阶段二：工具与 IPC 事件

4. agent-types、agent-tool-prompts-ext — 注册 SwitchMode
5. agent-ext-executor — 执行 + emit
6. agent-progress.ts、axecoder.d.ts — 类型

### 阶段三：Renderer + 文档

7. ChatPane.vue — 监听 chat_mode
8. rppit-axecoder-addon.ts、subagent 过滤
9. 单测 UT-switch-mode-tool

## 测试策略

- 新目录 UT-switch-mode-tool
- 扩展 agent-tool-layer-parity 可选
- 跑全量单测
