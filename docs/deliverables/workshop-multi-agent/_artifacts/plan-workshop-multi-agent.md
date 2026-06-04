# workshop-multi-agent 实施计划

**状态：** 已确认方案 `docs/proposals/proposal-workshop-multi-agent.md`

## 阶段 1 – 模式与标签同步（前端）

1. `ChatPane`：`onChatModePick('multi-agent')` → 激活/新建 workshop 标签；其他模式且当前 workshop → 切回 agent 标签。
2. `switchUnifiedTab`：进 workshop 强制 `multi-agent`；离 workshop 恢复 `lastAgentChatMode`。
3. `onMounted`：若 localStorage 为 `multi-agent`，加载后进入 workshop。

## 阶段 2 – 文案与入口

1. `AgentsPanel`：按钮与 `kindLabel` 使用 Multi-Agent。
2. `chat-modes.ts`：更新 multi-agent 描述为协作编排。
3. `WorkshopChatSection` 默认标题 Multi-Agent。

## 阶段 3 – 后端 chat-mode

1. `chat-mode.ts`：`multi-agent` 不再 `revealedToolNames.add('Agent')`；system addon 说明走 Workshop。

## 阶段 4 – 测试

1. 新增 `UT-chat-mode-workshop`：`applyChatModeToNewSession` / `chatModeSystemAddon`。
