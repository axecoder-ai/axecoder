# 选型记录

## 2a 选型摘要

**需求回顾：** Workshop 成员 Agent 发言时，应像主 Chat Agent 一样同时展示输出正文与 Thinking/工具步骤（`AgentProgressStream`），避免 `thinking` 进度事件清空流式 UI 或仅显示三点动画。

| 维度 | 提案 1 修复进度互斥 | 提案 2 ChatPane 底部进度条 |
|------|---------------------|---------------------------|
| 核心思路 | 保留角色行内 `AgentProgressStream`，修 `onWorkshopProgress` | 与 Agent 共用 ChatPane 底部气泡 |
| 改动范围 | `WorkshopChatSection` + `WorkshopMessageItem` | `ChatPane` + 事件上抛 |
| 优点 | 最小 diff、多角色清晰 | DOM 与 Agent 完全一致 |
| 缺点 | 布局与 Agent 略不同 | 进度条难标角色 |
| 工作量 | 小 | 中 |
| 适合场景 | 当前 Workshop-in-ChatPane | 强 UI 像素级一致 |

**关键差异：**
- 提案 1 不拆 ChatPane，只修互斥逻辑。
- 提案 2 需重构进度归属与 IPC 上抛。
- 历史 `reasoningContent` 两案均可改用 `AgentProgressStream`。
- 无 Agent 的路由 thinking 两案均保留轻量三点动画。

**推荐：提案 1 – 修复 Workshop 进度互斥**（与现有 `workshop-agent-parity` 进度绑定一致，改动最小。）

## 2b 用户选择

- **选定：** 提案 1 – 修复 Workshop 进度互斥
- **调整：** 保留 Workshop 角色头像行
