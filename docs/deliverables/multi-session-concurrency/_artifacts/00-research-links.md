# 调研来源

- 对话上下文：Session 切换修复 + 用户追问「无法做到真正的并发吗」
- 代码调研：`src/components/workbench/ChatPane.vue`、`src/composables/useChatSessionRuns.ts`、`electron/main/agent/agent-session-store.ts`、`electron/main/agent/agent-loop.ts`
- 单测参考：`tests/unittest/UT-chat-session-run-state/chat-session-run-state.test.ts`
