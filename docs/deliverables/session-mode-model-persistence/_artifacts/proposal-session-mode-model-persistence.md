**状态：** 已确认

## Confirmed Solution Proposal

**Context:**
- **Request:** Session 发送消息时记录 chatMode + modelId；切换时恢复；旧 session 无字段保持当前 UI；新建用全局默认；嵌入 Workshop 恢复完整状态。
- **Research sources:** `docs/requirements/session-mode-model-persistence.md`；`chat-store.ts`、`ChatPane.vue`、`WorkshopChatSection.vue`
- **Selected base:** 提案 1 – 就地扩展 Session 字段
- **User adjustment:** resolve/stamp 纯函数抽到 `src/utils/session-preferences.ts` 便于单测

### Final Proposal – 就地扩展 Session 字段 + 纯函数工具

- **Overview:** `ChatSession` 增加 `modelId`；新建 `session-preferences.ts` 封装切换解析与发送写入；ChatPane / WorkshopChatSection 在切换与发送路径调用；移除「切走/改下拉即写 session」逻辑。
- **Key changes:**
  - `electron/main/chat-store.ts`、`src/types/axecoder.d.ts` — `modelId?`
  - `src/utils/session-preferences.ts` — `resolveSessionChatModeOnSwitch`、`resolveSessionModelIdOnSwitch`、`stampSessionPreferences`、`newSessionPreferences`
  - `ChatPane.vue` — 切换恢复、发送 stamp、`newChat` 默认、本地 model UI 不调用 `setActiveModel`
  - `WorkshopChatSection.vue` — `selectSession` 恢复 modelId；发送时写 modelId
- **Validation:** `UT-session-preferences` 单测；更新 `UT-chat-modes-ui`；手工 A/B session 切换验收
- **Open questions:** 无

### Rejected Alternative

- **Not selected:** 提案 2 Composable 层 — 用户选择最小改动路径
