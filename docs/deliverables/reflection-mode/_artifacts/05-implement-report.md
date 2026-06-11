# 功能实现报告：Reflection 反思模式

## 功能说明

恢复并落地 Reflection 聊天模式：

1. 模式选择器可见 Reflection，可从 `DISABLED_CHAT_MODES` 选用
2. 选中后与 Multi-Agent 一样嵌入 Workshop 面板（`ma-{chatId}` 绑定）
3. 用户发消息走 `sendReflectionMessage` 固定编排：Developer → Tech Lead → Reviewer → Tech Lead，最多 3 轮，Tech Lead 最终收尾
4. Developer / Reviewer 使用 `buildAgentRoleSpeaker` 完整工具能力；Tech Lead 通过 `buildWorkshopRouterLlm` 纯文字 JSON
5. `reflection` ↔ `multi-agent` 有消息时互斥；可切回 Agent 等普通模式

## 修改文件列表

| 文件 | 变更 |
|------|------|
| `electron/main/workshop/reflection-turn-orchestrator.ts` | 新增编排器 |
| `electron/main/workshop-ipc.ts` | `orchestrationChatMode` 分支 |
| `electron/main/agent/chat-mode.ts` | 开放 reflection |
| `electron/preload/index.ts` | IPC 透传 |
| `src/utils/chat-modes.ts` | 选项、锁定逻辑 |
| `src/types/axecoder.d.ts` | 类型 |
| `src/composables/useWorkbenchSession.ts` | 透传 |
| `src/components/workbench/ChatPane.vue` | 嵌入模式泛化 |
| `src/components/workbench/WorkshopChatSection.vue` | prop 透传 |
| `tests/unittest/UT-reflection-orchestrator/` | 新增单测 |
| `tests/unittest/UT-chat-mode-lock/chat-mode-lock.test.ts` | 更新 |

## 单测覆盖

- `parseReflectionRoundJudge` / `parseReflectionComment`
- `sendReflectionMessage` 单轮收尾、3 轮硬上限
- `canPickChatMode` reflection 互斥与切回 Agent

## 注意事项

- SwitchMode 仍不支持 reflection（本期范围外）
- Tech Lead 轮次判断依赖 LLM JSON，生产环境需模型配合
- Multi-Agent 有消息后现可切回 Agent（对齐 PRD FR-10，行为较旧版放宽）
