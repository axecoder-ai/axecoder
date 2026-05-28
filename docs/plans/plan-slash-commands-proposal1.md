# 聊天斜杠命令（提案 1）设计文档

> 依据：`docs/proposals/proposal-slash-commands.md` **提案 1**（Renderer `src/slash-commands/` + 发送前本地分发）  
> **范围：** V1 仅 **`local`** 类命令：`/help`、`/clear`、`/new`、`/model`；`ChatPane.send()` 拦截；**不**实施 Main `slash:execute`、prompt 型命令、typeahead、插件/Skill 动态命令、`/export`。  
> **约束：** 斜杠行**不进** `ai:chat` / `agent:send` 的 API messages；与 Agent pending 写盘互斥。  
> **不实施：** 本文档仅作计划，代码变更在评审后另 PR 完成。

## 变更范围、约束与时间线

| 项 | 说明 |
|----|------|
| **范围** | `src/slash-commands/*`；`runSlashCommand` 分发；`ChatPane.vue` `send()` 前置分支；`parse.ts` 单测 |
| **不在范围** | `electron/main/slash-commands`、IPC `slash:execute`、`type: 'prompt'`、`SlashCommandPicker`、MCP、`/compact` `/rewind` `/export` |
| **约束** | 对齐 `claude-code` 语义：发送前拦截（`processSlashCommand.tsx`）；命令实现**流水账**、少抽象；新增命令只增目录 + registry 一行 |
| **时间线（估）** | **约 1–1.5 人日**：解析+registry 0.25d → 四命令 0.5d → ChatPane 接线+门控 0.25d → 单测+手工验收 0.25d |

---

## 当前背景

- **现状：** `ChatPane.vue` `send()`（约 `:417-484`）对 `input` trim 后直接拼 `userMsg` 并调用 `agentSend` / `aiChat`，**无** `/` 检测。
- **已有能力可复用：**
  - 会话持久化：`persist()`、`saveChatSession`（`electron/main/chat-store.ts`）。
  - `newChat()`（`:171-188`）、`onModelPick` + `setActiveModel`（`:222-225`）、`emit('openModelsSettings')`（`:35`）。
- **参考：** `claude-code/src/commands/<name>/index.ts` 元数据；`claude-code/src/utils/slashCommandParsing.ts` 解析子集；`claude-code/src/utils/processUserInput/processSlashCommand.tsx` 拦截后不进模型。
- **痛点：** 用户无法用 `/clear`、`/help` 等管理会话；与 Claude Code 使用习惯不一致。

---

## 需求

### 功能需求（P0）

- **F1 拦截：** 输入以 `/` 开头且解析为已知命令时，走斜杠管道，**不**向模型发送该条用户消息。
- **F2 `/help`：** 输出已注册命令名、别名、`description` 的纯文本列表。
- **F3 `/clear`：** 清空**当前会话** `messages[]`，保留 `id`；`persist()`；标题可保留或改为「新对话」（实现时二选一，见设计决策）。
- **F4 `/new`：** 调用 `ChatPane` 已有 `newChat()`，新建会话并切换（与工具栏 `+` 一致）。
- **F5 `/model`：**
  - 无参数：触发 `openModelsSettings`（与「Add Models」一致）。
  - 有参数：将参数视为 `modelId`，若存在于已启用模型则 `setActiveModel` 并刷新 `modelsFile`；否则助手条提示可用 id 列表。
- **F6 未知命令：** 助手条提示「未知命令，输入 /help」；**不**调模型。
- **F7 项目门控：** 未打开项目时，斜杠与发消息一致：不执行（或仅提示「请先打开项目」）。
- **F8 忙碌门控：** `loading` 或 `pendingBusy` 或当前会话存在未处理 `pendingWrites` 时，拒绝斜杠并提示先完成 Agent 确认/等待回复。

### 非功能需求

- 命令结果以 `role: 'assistant'` 文本展示，前缀可选 `[命令 /help]` 便于与模型回复区分（样式 V1 可用现有气泡，不加新组件）。
- 解析函数可单测、无 Vue 依赖。

### 不在本期（P2）

- `/export`、`/compact`、`typeahead、`prompt` 型命令、Main 侧 registry、消息里存 `slashCommand: true` 结构化字段（除非联调需要再加）。

---

## 设计决策

### 1. 目录与注册（提案 1）

- **选择：** `src/slash-commands/`，每命令一目录 `help/index.ts` 导出 `SlashCommandDef`；`registry.ts` 聚合 `allCommands()`。
- **理由：** 与提案及 `claude-code/src/commands/` 一一对应；边界清晰。
- **不采用：** 提案 2 Main IPC（本期不做）。

### 2. 分发入口

- **选择：** `src/slash-commands/run.ts` 导出 `runSlashCommand(input, ctx) → SlashRunResult`；`ChatPane.send()` **第一行**（在 `loading` 检查之后）调用。
- **理由：** 对齐 `processSlashCommand`「在进模型前处理」；`ChatPane` 只负责组 `SlashContext` 与展示结果。
- **不采用：** 在 `toApiMessages` 里过滤——太晚，用户消息已进历史。

### 3. `/clear` 与 `/new` 语义

- **选择：**
  - `/clear` → 仅 `messages = []`，**同一** `session.id`，`updatedAt` 更新，`persist`。
  - `/new` → 复用 `newChat()`（新 id、新会话文件）。
- **理由：** 对齐 Claude Code `/clear` 与别名 `new` 的差异：WritCraft 将 `new` 独立为新建标签页式会话，避免误清当前 id。
- **备注：** `registry` 可为 `clear` 注册 `aliases: ['reset']`，**不**把 `new` 作为 clear 别名（与 `claude-code` 的 clear 别名略有不同，在 `/help` 文案中写清）。

### 4. 用户消息是否留痕

- **选择：** V1 **不**把 `/help` 等写入 `messages`（仅插入助手结果条）；输入框清空。
- **理由：** 减少 API 历史噪音；与「不进模型」一致。
- **可选二期：** 灰色系统条记录用户输入的命令行（审计用）。

### 5. `/model` 参数

- **选择：** 首词为 `modelId`（`parse` 的 `args` 整体 trim）；不支持子命令 `model:list`（V1）。
- **理由：** 现有 `ModelsFile.models[].id` 已稳定；复杂 UI 走设置页。

---

## 技术设计

### 1. 类型（`src/slash-commands/types.ts`）

```ts
export type SlashCommandDef = {
  name: string
  aliases?: string[]
  description: string
  run: (ctx: SlashContext, args: string) => Promise<SlashRunResult>
}

export type SlashContext = {
  projectRoot: string
  getSession: () => ChatSession | null
  setSession: (s: ChatSession) => void
  persist: () => Promise<void>
  newChat: () => Promise<void>
  getModelsFile: () => ModelsFile
  setModelsFile: (m: ModelsFile) => void
  setActiveModel: (id: string) => Promise<{ ok: boolean; data?: ModelsFile }>
  openModelsSettings: () => void
}

export type SlashRunResult =
  | { ok: true; message: string; /** 如 /new 已切换会话，无需再插 assistant */ silent?: boolean }
  | { ok: false; message: string }
```

### 2. 解析（`src/slash-commands/parse.ts`）

- 输入须 `trim` 后以 `/` 开头；去掉 `/` 后按**首个空格**拆 `commandName` 与 `args`。
- `commandName` 转小写匹配（可选，建议统一小写注册名）。
- **不**实现 MCP `(MCP)` 后缀（`slashCommandParsing.ts` 子集）。
- 支持 `name:sub` 形式仅当未来需要；V1 可不解析冒号。

### 3. 分发（`src/slash-commands/run.ts`）

```ts
// 伪代码流水账
const parsed = parseSlashCommand(input)
if (!parsed) return null // 非斜杠，交 ChatPane 正常 send
const def = findCommand(parsed.commandName) // name + aliases
if (!def) return { ok: false, message: '...' }
return def.run(ctx, parsed.args)
```

### 4. `ChatPane.send()` 变更要点

```ts
// send() 内，hasProject / trim 之后：
if (text.startsWith('/')) {
  if (loading.value || pendingBusy.value || hasPendingWritesInSession()) {
    // push assistant 提示，return
  }
  input.value = ''
  resizeInput()
  const result = await runSlashCommand(text, buildSlashContext())
  if (result === null) { /* 解析失败当普通消息？V1: 未知命令已在 run 内处理 */ }
  if (result && !result.silent) {
    activeSession.value!.messages.push({ role: 'assistant', text: result.message })
    await persist()
  }
  return
}
// 原有 agentSend / aiChat 逻辑
```

`hasPendingWritesInSession()`：遍历 `activeSession.messages`，任一 `msg.pendingWrites?.length` 则 true。

### 5. 各命令实现要点

| 命令 | 文件 | `run` 逻辑 |
|------|------|------------|
| `help` | `help/index.ts` | 遍历 `allCommands()` 格式化为 Markdown 或纯文本列表 |
| `clear` | `clear/index.ts` | `session.messages = []`；`updatedAt = Date.now()`；`persist` |
| `new` | `new/index.ts` | `await ctx.newChat()`；`{ ok: true, silent: true }` 或短确认文案 |
| `model` | `model/index.ts` | `args` 空 → `openModelsSettings`；否则 `setActiveModel` |

### 6. 数据流

```
用户 Enter
  → ChatPane.send
  → text.startsWith('/') ?
       yes → runSlashCommand
            → local run (help/clear/new/model)
            → assistant 消息 + persist（或不插消息）
            → return（不调用 agentSend / aiChat）
       no  → 现有流程
```

---

## 文件变更清单（实施时唯一改动集）

**新建**

- `src/slash-commands/types.ts`
- `src/slash-commands/parse.ts`
- `src/slash-commands/registry.ts`
- `src/slash-commands/run.ts`
- `src/slash-commands/help/index.ts`
- `src/slash-commands/clear/index.ts`
- `src/slash-commands/new/index.ts`
- `src/slash-commands/model/index.ts`
- `tests/unittest/UT-slash-commands/parse.test.ts`（或项目现有 vitest 目录）

**修改**

- `src/components/workbench/ChatPane.vue` — `send()` 分支、`buildSlashContext()`（可内联在 script 内，不必单独文件）
- `src/components/workbench/ChatPane.vue` — 输入框 `placeholder` 增加「`/` 查看命令」

**不改**

- `electron/main/*`、`preload`、`writcraft.d.ts`（V1 无新 IPC）
- `AgentsPanel.vue`（会话列表仍由 `newChat` / `persist` 驱动刷新）

---

## 实施计划

### 阶段一：骨架 + 解析（约 0.25 人日）

- 建 `types.ts`、`parse.ts`、`registry.ts`、`run.ts`（`help` 占位返回列表）。
- vitest：`/help`、`/clear`、`/model foo`、`/unknown`、非 `/` 开头返回 null。

### 阶段二：四命令 + registry（约 0.5 人日）

- 实现 `help` / `clear` / `new` / `model` 四个 `index.ts`（流水账 `run`）。
- `registry.ts` 注册全部命令与 `clear` 的 `reset` 别名。

### 阶段三：ChatPane 接线（约 0.25 人日）

- `send()` 前置分支与门控（F7、F8）。
- `SlashContext` 绑定 `activeSession`、`persist`、`newChat`、`onModelPick` 等。
- placeholder 文案。

### 阶段四：验收（约 0.25 人日）

- 手工清单（见下）。
- 更新 `docs/proposals/proposal-slash-commands.md` 底部「与实现关系」一行（可选）。

---

## 测试策略

### 单元测试

| 用例 | 预期 |
|------|------|
| `parseSlashCommand('/help')` | `{ commandName: 'help', args: '' }` |
| `parseSlashCommand('/model id-1')` | `{ commandName: 'model', args: 'id-1' }` |
| `parseSlashCommand('hello')` | `null` |
| `findCommand('reset')` | 指向 `clear` |

### 手工验收

| 场景 | 预期 |
|------|------|
| `/help` | 列表含 4 命令；网络请求无；历史无 user `/help` |
| `/clear` 后有消息再发普通话 | 新话不带上文 |
| `/new` | 新 tab 会话；Agents 列表多一条 |
| `/model` | 打开模型设置 |
| `/model <有效 id>` | 下拉当前模型变 |
| Agent pending 时 `/clear` | 拒绝并提示 |
| `loading` 时 `/help` | 拒绝并提示 |
| 未打开项目 | 与现有一致，不执行 |

---

## 可观测性

- V1 无专门日志；可选 `console.debug('[slash]', name)` 仅开发构建。
- 不采集指标。

---

## 安全考量

- 斜杠命令不扩大文件系统权限；`clear`/`new` 仅改当前项目下 `.writcraft/sessions`（经既有 `saveChatSession`）。
- `/model` 仅切换本地已配置模型 id，不向外部泄露密钥。

---

## 与 Claude Code 差异（实现时避免照抄过度）

| 项 | Claude Code | WritCraft V1 |
|----|-------------|--------------|
| `clear` 别名 `new` | 同命令 | `/new` 独立为新会话 |
| `local-jsx` / `prompt` | 有 | 无 |
| 懒加载 `load()` | 有 | 同步 import 即可 |
| 命令进 transcript | 部分带 XML 标签 | 仅 assistant 文本 |

---

## 后续考虑（提案 2 / V2）

- `/export`：`dialog.showSaveDialog` + 写 JSON/Markdown（需 Main IPC 或现有 `fs:writeFile` 若已有）。
- `SlashCommandPicker.vue`：输入 `/` 过滤 `allCommands()`。
- `type: 'prompt'`：`/review` 展开模板再 `agentSend`。
- 重命令下沉 `electron/main/slash-commands` + `slash:execute`（见 `proposal-slash-commands.md` 提案 2）。

---

## 参考资料

- `docs/proposals/proposal-slash-commands.md` — 提案全文
- `docs/research/research-claude-code.md` — §4 斜杠命令分类
- `docs/research/research-ide-basics.md` — IPC 边界
- `docs/proposals/proposal-chat.md` — ChatPane 发送路径
- `docs/plans/plan-chat-file-agent-proposal1.md` — Agent 与斜杠正交
- `claude-code/src/commands.ts`、`claude-code/src/commands/clear/index.ts`
- `claude-code/src/utils/slashCommandParsing.ts`
- `claude-code/src/utils/processUserInput/processSlashCommand.tsx`
- `src/components/workbench/ChatPane.vue`
