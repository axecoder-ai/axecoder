# SwitchMode 工具 — 选型记录

## 一句话需求回顾

为 AxeCoder Agent 新增 **SwitchMode** 工具，对齐 Cursor playbook（`target_mode_id: agent | plan`），并扩展支持会话级 ChatMode 切换与 Renderer UI 同步。

## 方案对比表

| 维度 | 提案 1 Cursor 兼容薄封装 | 提案 2 统一会话模式 |
|------|-------------------------|---------------------|
| 核心思路 | SwitchMode 仅映射 planMode，等价 Enter/Exit | SwitchMode 同步 ChatModeId + planMode + activeTools + UI |
| 主要改动范围 | executor + 工具注册 + addon | 上述 + session.chatMode + agent:progress + ChatPane |
| 优点 | 最小 diff、Cursor 1:1 | 一个工具覆盖模式切换；UI 与运行时一致 |
| 缺点 / 风险 | 不更新 chat mode 下拉 | 改动面较大；multi-agent/rppit 切换需约束 |
| 工作量 | 小 | 中 |
| 适合场景 | 仅 rppit 步骤 0a 对齐 | 长期统一模式 UX |

## 关键差异说明

- 提案 1 只动 `planMode` 布尔值；ChatPane 下拉仍显示用户发送前选的模式。
- 提案 2 在 Main 侧维护 `session.chatMode`，工具调用后通过 `agent:progress` 通知 Renderer 更新。
- 提案 2 支持 `planning` / `planning-only` / `auto-plan` / `reflection` 等扩展 target（`plan` 为 Cursor 别名 → `planning`）。
- 两方案均保留 EnterPlanMode / ExitPlanMode 向后兼容。

## 推荐方案

**推荐：提案 1 – Cursor 兼容薄封装**

理由：满足 rppit / make-proposals 最小需求，回归面小，与 Cursor API 完全一致。

## 用户最终选择

- **选定：提案 2 – SwitchMode 统一会话模式（含 ChatModeId + UI 同步）**
- **调整说明：无额外调整**
