# 功能实现报告

## 功能说明

- `ChatSession` 增加 `modelId`，与已有 `chatMode` 一起在**发送消息时**写入。
- 新增 `src/utils/session-preferences.ts` 纯函数：切换时「有记录恢复、无记录保持当前 UI」。
- `ChatPane`：切换 session 恢复 Mode/Model；嵌入 Workshop 时 `syncMultiAgentWorkshop`；新建 session 用 Agent + 全局默认模型。
- `WorkshopChatSection`：独立 Tab 切换时恢复 `modelId`；新建用全局默认。

## 修改文件

| 文件 | 说明 |
|------|------|
| `src/utils/session-preferences.ts` | 新增 resolve/stamp/newSession 纯函数 |
| `electron/main/chat-store.ts` | ChatSession.modelId |
| `src/types/axecoder.d.ts` | 类型同步 |
| `src/components/workbench/ChatPane.vue` | 切换恢复、发送 stamp、newChat 默认 |
| `src/components/workbench/WorkshopChatSection.vue` | Workshop 切换恢复 modelId |
| `tests/unittest/UT-session-preferences/session-preferences.test.ts` | 新增单测 |

## 注意事项

- 切换 session 恢复 model 时仅改本地 `modelsFile.activeModelId`，不调用 `setActiveModel`，避免污染全局默认。
- 用户主动选模型仍走 `setActiveModel` 并更新 `globalDefaultModelId`。
- 旧 session 无 `chatMode`/`modelId` 时保持当前 UI，不回退 localStorage。
