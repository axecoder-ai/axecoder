# 解决方案提案：聊天功能（Cursor 风格）

---

## 解决方案提案

**上下文：**
- **请求：** 实现右侧 AI 聊天：Cursor 式统一输入框（`#262626`、12px 圆角、底部 Agent/模型/发送）、消息区、Agents 历史侧栏；对接已有多模型 `ai:chat`。
- **调研来源：**
  - `docs/research/research-ide-basics.md` — Renderer 经 `window.writcraft` IPC、Chat/Agents 曾为 mock（现已接真实 IPC）。
  - `docs/plans/plan-chat-model-picker.md` — 模型浮层下拉、Add Models 走设置页。
  - `docs/proposals/proposal-models-settings.md` — `~/.writcraft` 存储、`ai:chat(modelId, messages)`。
  - **代码现状：** `ChatPane.vue`、`AgentsPanel.vue`、`electron/main/chat-store.ts`、`electron/main/ai-ipc.ts` 已存在。
  - **调研缺口：** 无 `docs/research/research-chat.md`；流式回复、代码 diff 块 UI 未在调研中覆盖。

---

**提案 1 – 单组件 ChatPane + 现有 IPC（推荐，已按此实施）**

- **概述：** 在 `ChatPane` 内完成会话 CRUD、发送、`markdown-it` 渲染助手回复；输入区 Cursor 样式；`AgentsPanel` 只读当前项目 `<项目>/.writcraft/sessions/index.json`；`App.vue` 桥接选中会话与列表刷新。
- **关键变更：**
  | 模块 | 变更 |
  |------|------|
  | `ChatPane.vue` | 发送/持久化、`ModelPickerDropdown`、发送钮 `active` 态、Markdown 回复 |
  | `AgentsPanel.vue` | `activeSessionId` 高亮、`selectSession` |
  | `App.vue` | `activeChange` / `sessionsChanged` 接线 |
  | Main | `chat:*` 按 `projectRoot` 读写 `<项目>/.writcraft/sessions/`；`ai:chat` 仍用 `~/.writcraft` 模型 |
- **权衡：**
  - **收益：** 改动面小、与现有模型设置一致；样式可对齐参考图。
  - **风险：** 组件变大；无流式时长回复体验一般；`v-html` 需信任本地模型输出。
- **验证：**
  - 手工：配置模型 → 发消息 → 重启后会话仍在；Agents 切换会话；无模型时提示。
  - 可选：对 `chat-store` 读写加 vitest。
- **待解决问题：**
  - 流式 `ai:chatStream`（Phase 2）。
  - 代码 diff /「Explored N files」类块 UI（Phase 2）。

---

**提案 2 – 聊天状态 Composable + 可选流式层**

- **概述：** 抽出 `useChatSessions()`（sessions、activeId、send、persist）与 `useChatStream()`；`ChatPane` 仅负责布局；Main 增加 `ai:chatStream` 通过 `webContents.send` 推送 token。
- **关键变更：**
  - `src/composables/useChatSessions.ts`（新建）
  - `electron/main/ai/stream-*.ts`、`preload` 事件订阅
  - `ChatPane` 变薄，消息组件 `ChatMessageList.vue` / `ChatInputBox.vue`
- **权衡：**
  - **收益：** 易测、易加流式与工具调用；消息渲染可独立演进。
  - **风险：** IPC/预加载改动多；首期交付慢于提案 1。
- **验证：**
  - 单测 composable 的会话切换与历史拼接。
  - 集成：mock stream 逐 chunk 更新 UI。
- **待解决问题：**
  - 流式中断、重试、与 `loading` 状态机设计。
  - 是否与 Agent 工具（读文件）共用一条消息管道。

---

## 与当前实现的关系

| 项 | 状态 |
|----|------|
| 提案 1 核心（发送、持久化、Cursor 输入框、Agents 同步） | 已实现 |
| 提案 1 待办（流式、diff 块） | backlog |
| 提案 2 | 未实施，供后续重构参考 |
