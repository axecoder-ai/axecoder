# 解决方案提案：聊天斜杠命令（`/commands`）

---

## 解决方案提案

**上下文：**
- **请求：** 为 WritCraft 聊天输入实现斜杠命令；**单独建目录**集中实现；借鉴本地 `参考实现` 的 `src/commands/` + `commands.ts` 注册与分发模式。
- **调研来源：**
  - `docs/research/research-参考实现.md` — §2 架构（`src/commands/`、`src/commands.ts`）、§4 斜杠命令分类（会话/配置/诊断等约 70+）、§5 扩展（Skills/Plugins 动态命令）。
  - `docs/research/research-ide-basics.md` — Renderer 仅经 `window.writcraft` IPC；Chat 已接真实会话持久化（§3.4 注：调研时曾为 mock，现状以代码为准）。
  - `docs/plans/plan-chat-file-agent-proposal1.md` — Agent 文件工具范围**明确不含**斜杠命令；与本提案正交、可并行排期。
  - `docs/proposals/proposal-chat.md` — `ChatPane.vue` 发送路径、`agent:send` / `ai:chat` 分工。
  - **参考实现（本地快照，不进 git）：** `参考实现/src/commands.ts`（`COMMANDS` 注册、`getCommands` 懒加载）、`参考实现/src/commands/<name>/index.ts`（元数据 + `load()`）、`参考实现/src/utils/processUserInput/processSlashCommand.tsx`（发送前拦截、`local` / `prompt` / `local-jsx` 三类）、`参考实现/src/types/command.ts`。
- **代码现状：**
  - `ChatPane.vue` `send()`（约 `:417-484`）：trim 后直接 `agentSend` / `aiChat`，**无** `/` 前缀检测。
  - 会话：`chat-store` + `getChatSession` / `saveChatSession`；`newChat()` 已存在，可映射 `/clear` / `/new`。
  - Agent：`electron/main/agent/agent-loop.ts` 多轮 tool；斜杠命令不应与 tool_use 混在同一轮解析里。
- **调研缺口：** 无 `docs/research/research-slash-commands.md`；`/compact` 依赖摘要 API 与 token 统计，需单独 spike；插件/Skill 动态命令（`getPluginCommands`）本期不做。

---

**提案 1 – Renderer 专用目录 + 发送前本地分发（推荐，契合「单独文件夹」）**

- **概述：** 在 `src/slash-commands/` 为每个命令建子目录（或单文件），根目录 `registry.ts` 汇总；`ChatPane.send()` 在调用 `agentSend` / `aiChat` **之前**若 `text.startsWith('/')` 则走 `runSlashCommand()`，成功则**不**把该行当普通用户消息进模型（对齐 `processSlashCommand` 拦截语义）。V1 只做 **`type: 'local'`**（改会话/UI/调已有 IPC），不做 fork 子代理。
- **关键变更：**
  | 模块 | 变更 |
  |------|------|
  | `src/slash-commands/registry.ts` | `SlashCommandDef[]`：`name`、`aliases?`、`description`、`run(ctx, args)` |
  | `src/slash-commands/<name>/index.ts` | 各命令实现（流水账式 `run`，少抽象） |
  | `src/slash-commands/parse.ts` | 解析 `/name`、子命令 `name:sub`、参数串（可参考 `参考实现/src/utils/slashCommandParsing.js` 子集） |
  | `src/slash-commands/types.ts` | `SlashContext`：`projectRoot`、`activeSession`、`modelsFile`、`emit` 回调等 |
  | `ChatPane.vue` | `send()` 开头分支；助手区展示命令结果（`role: 'assistant'` 纯文本或系统条） |
  | 可选 `SlashCommandPicker.vue` | 输入 `/` 时 typeahead（二期；V1 可仅 `/help` 列表） |
- **V1 建议命令（按现有能力，非照搬 70+）：**
  | 命令 | 行为 | 对标 同类 Agent |
  |------|------|------------------|
  | `/help` | 列出已注册命令与简介 | `/help` |
  | `/clear` | 清空当前会话消息（保留会话 id） | `/clear` |
  | `/new` | 调用现有 `newChat()` | `/clear` 别名 `new` |
  | `/model` | 打开模型设置或切换 `activeModelId` | `/model` |
  | `/export` | 导出当前会话 JSON/Markdown 到用户选路径 | `/export`（需 `dialog` IPC，可 V1.1） |
- **权衡：**
  - **收益：** 与 `proposal-chat.md` 提案 1 一致，改动集中在 Renderer；目录即产品边界，易加命令；不增加 Main IPC 面。
  - **风险：** 需要 Main 能力的命令（如未来 `/compact` 调摘要、`/doctor` 查环境）要在 `run` 里散落 `window.writcraft.*` 调用；与 Agent pending 写盘状态需约定「斜杠命令期间禁止 send」。
- **验证：**
  - 手工：`/help` 不出现在 API `messages`；`/clear` 后 `persist` 为空历史；Agent 进行中输入 `/clear` 应拒绝或先取消 pending。
  - 单测：`parse.ts` 对 `/model opus`、`/help foo` 的 name/args 拆分。
- **待解决问题：**
  - **`type: 'prompt'`**（把命令展开成 system/user 再调模型，如 `/review`）是否 V2 仍在 Renderer 拼 prompt，还是迁 Main。
  - 与 `App.vue` 菜单「新对话」、`newChat()` 行为统一文案。
  - 输入框占位提示「输入 / 查看命令」。

---

**提案 2 – Main 注册表 + IPC `slash:execute`（对齐 Agent 循环所在进程）**

- **概述：** 在 `electron/main/slash-commands/` 建注册表与实现；Preload 暴露 `slashExecute(projectRoot, sessionId, input)`；`ChatPane` 只负责检测 `/` 并调 IPC。Main 内可读写 `chat-store`、`agent-session-store`、触发压缩/导出，**与 `agent-loop` 同进程**便于日后 `/compact`、会话分支等。
- **关键变更：**
  | 模块 | 变更 |
  |------|------|
  | `electron/main/slash-commands/registry.ts` | 命令表 + `execute(name, args, ctx)` |
  | `electron/main/slash-commands/*.ts` | 各命令（`clear.ts`、`help.ts`…） |
  | `electron/main/slash-ipc.ts` | `slash:execute` handler |
  | `electron/preload/index.ts` + `writcraft.d.ts` | 桥接类型 |
  | `ChatPane.vue` | 薄封装：拦截 → IPC → 渲染 `SlashResult` |
- **权衡：**
  - **收益：** 敏感逻辑与 Agent 会话状态集中在 Main；未来 `/compact`、checkpoint/`/rewind` 与 `plan-chat-file-agent` 同层扩展自然。
  - **风险：** 每期交付 IPC + 类型 + 测试面更大；UI 型命令（打开设置 Tab、主题）仍需 Main → Renderer 事件，复杂度高于提案 1。
- **验证：**
  - 集成：Main vitest 对 `parse` + `clear` 改 `chat-store` 文件；E2E 一条 `/clear` 后磁盘 session 为空。
  - 安全：`slash:execute` 校验 `projectRoot` 与 `sessionId` 归属，防跨项目调用。
- **待解决问题：**
  - Renderer 反馈通道：纯文本 vs `webContents.send('slash:ui', …)` 打开面板。
  - 是否与 `agent:send` 合并为统一「用户输入管道」（长期可对齐 `QueryEngine` + `processUserInput`）。

---

## 与 同类 Agent 的对照（实现时必读）

| 同类 Agent | WritCraft 建议（提案 1 首期） |
|-------------|------------------------------|
| `src/commands/<cmd>/index.ts` 元数据 + `load()` 懒加载 | `src/slash-commands/<cmd>/index.ts` 导出 `def`；V1 可同步 import，命令少时不强求 lazy |
| `commands.ts` → `getCommands()` | `registry.ts` → `allCommands()` |
| `processSlashCommand` 在 `processUserInput` 内、**不进模型** | `ChatPane.send()` 最前分支 |
| `local` / `prompt` / `local-jsx` | V1 仅 `local`；`prompt` 二期；无 Ink，不做 `local-jsx` |
| Skills/Plugins 动态 `/skillName` | 不做；与 `.cursor/skills` 无关 |

---

## 推荐结论

| 优先级 | 选择 | 理由 |
|--------|------|------|
| **首期** | **提案 1** | 满足「专门文件夹」、最小 diff、现有会话/模型 API 均在 Renderer 可直达 |
| **二期** | 将需 Agent/摘要/磁盘批处理的命令**下沉**到提案 2 形态，或 hybrid：registry 在 Renderer，个别命令 delegate 到 `slash:execute` |

**建议目录骨架（提案 1）：**

```text
src/slash-commands/
  types.ts
  parse.ts
  registry.ts
  help/index.ts
  clear/index.ts
  new/index.ts
  model/index.ts
```

**实施顺序（估 1–2 人日）：** 解析 + registry → `/help` `/clear` `/new` → `ChatPane` 拦截与 UI → `/model` →（可选）typeahead 与 `/export` IPC。

---

## 与现有计划的关系

| 文档 | 关系 |
|------|------|
| `plan-chat-file-agent-proposal1.md` | 文件 Agent 与斜杠命令无依赖；可先做斜杠命令改善会话管理体验 |
| `proposal-chat-file-agent.md` | 未承诺斜杠；本提案补位 |
| `research-参考实现.md` §4 | 命令清单为**长期 backlog**，V1 只实现上表 4–5 个 |
