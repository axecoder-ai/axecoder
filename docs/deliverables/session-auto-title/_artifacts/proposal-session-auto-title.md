# Session 主题自动命名

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 会话列表 title 随对话内容更新为主题摘要；覆盖 Agent 对话。
- **调研来源：** `ChatPane.vue`、`chat-store.ts`、`api-model-resolve.ts`；见 `_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-session-auto-title.md`（双方案草稿）
- **选定基础：** 提案 3 – 混合
- **用户调整摘要：** 本期不做手动重命名 UI；仅自动更新；用户若已有非占位 title 则不覆盖

---

### 最终方案 – 首句占位 + 多轮后 LLM 主题标题

- **概述：** 新建会话仍用首条 user 消息截断（24 字）作占位。当会话至少 4 条消息（约 2 轮对话）且 title 仍为占位（`New Agent` / `新对话` / 与首条 user 相同 / 过短问候）时，Main 用 **fast API** 根据最近若干轮对话生成 6–16 字中文主题，写回 `ChatSession.title` 与 registry。Renderer 在 `persist` 后异步调用，不阻塞发送；无模型或失败则保持占位。
- **相对选定提案的变更：** 明确「非占位不覆盖」= 非上述占位条件则不调用 LLM。
- **关键变更：**
  - `electron/main/session/session-title.ts` — prompt、解析、占位判定
  - `electron/main/session/session-ipc.ts` — `session:suggestTitle`
  - `electron/main/index.ts` — 注册 IPC
  - `electron/preload/index.ts`、`src/types/axecoder.d.ts`
  - `src/components/workbench/ChatPane.vue` — 触发时机与更新 UI
- **权衡：** 列表 title 可能从首句闪到主题；额外 1 次 fast API/会话（非每轮）。
- **验证：** `UT-session-auto-title` 单测；手工多轮对话后侧栏变主题。
- **待解决问题：** Workshop 自动标题留后续；手动重命名 UI 留后续。

### 未采纳方案说明

- **提案 2：** 无 LLM，主题质量不足，未选。
