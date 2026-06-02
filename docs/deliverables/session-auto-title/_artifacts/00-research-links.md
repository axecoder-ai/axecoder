# 调研链接

- `src/components/workbench/ChatPane.vue` — 首条用户消息截断 24 字更新 title（仅 `New Agent` / `新对话`）
- `electron/main/chat-store.ts` — Agent 会话持久化与 `sessions/index.json` 注册
- `electron/main/workshop/workshop-store.ts` — Workshop 用 `userBrief` 截断作 title
- `electron/main/ai/api-model-resolve.ts` — fast/deep 模型路由，可复用于轻量标题任务
- `docs/deliverables/unified-session-list/` — 统一 Agents 侧栏列表，title 来自 registry
