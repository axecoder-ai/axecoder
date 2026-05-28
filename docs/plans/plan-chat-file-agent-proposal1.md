# 聊天 Agent 文件工具（提案 1）设计文档

> 依据：`docs/proposals/proposal-chat-file-agent.md` **提案 1**（对齐本地 `claude-code` 快照）  
> **范围：** Main 侧 Agent 多轮循环；工具 **Read / Edit / Write / Grep / Delete / Move**；写盘前 **structuredPatch** 确认；**不**实施 Bash、MCP、子代理、斜杠命令。  
> **约束：** Renderer 不经 `fs`；路径限制在 `projectRoot`；密钥与 API 仅在 Main。  
> **不实施：** 本文档仅作计划，代码变更在评审后另 PR 完成。

## 变更范围、约束与时间线

| 项 | 说明 |
|----|------|
| **范围** | `electron/main/agent/*` 工具注册与循环；`ai:chatWithTools`；IPC `agent:send` / `agent:confirmWrite` / `agent:rejectWrite`；`ChatPane` diff 确认 UI；`fileReadCache` |
| **不在范围** | Glob、流式回复、checkpoint/`/rewind`、完整 permissions 规则引擎、`CLAUDE.md`、Ollama tools（无则禁用 Agent 模式）、人手 IDE 改动 |
| **约束** | 工具名/schema 对齐 `claude-code` **Read/Edit/Write/Grep**；Edit 输入为 `old_string`/`new_string`，非模型交 unified diff；删/移走 `fs:delete`/`fs:move`，不用 Bash |
| **时间线（估）** | **约 4–6 人日**：Spike 0.5d → Main 工具+循环 2d → Edit/utils 单测 0.5d → Renderer 确认 UI 1d → 联调验收 1d |

---

## 当前背景

- **现状：** `ChatPane.vue` `send()` 调用 `ai:chat` 单轮文本（`electron/main/ai/chat-with-provider.ts`）；附件经 `chat:expandUserWithFiles` **只读**拼进 prompt（`src/utils/chat-file-context.ts`）。模型**不能**写盘。
- **磁盘层已具备：** `electron/main/fs-ipc.ts` 的 `readFile` / `writeFile` / `createFile` / `delete` / `rename` / `move` / `search`（ripgrep）；`fs-utils.ts` 的 `isPathInsideRoot`。
- **参考实现：** 仓库根 `claude-code/` → `~/workspace/claude-code`（`.gitignore`，研究用快照）；文件工具见 `FileReadTool` / `FileEditTool` / `FileWriteTool` / `GrepTool`；循环见 `QueryEngine.ts`。
- **痛点：** 用户需要聊天完成「读 / 建 / 删 / 改 / 移」项目文件；当前仅能人工操作 IDE 或把文件内容贴进对话。

---

## 需求

### 功能需求（P0）

- **F1 Read：** 模型可调用 **Read** 读取 `projectRoot` 内绝对路径文件；返回带行号正文（格式在实现阶段与快照 `FileReadTool` 对齐或文档化简化子集）。
- **F2 Edit：** **Edit** 使用 `file_path`、`old_string`、`new_string`、可选 `replace_all`；`old_string` 须唯一（否则 tool error）；未在会话内 **Read** 过该文件则拒绝 Edit。
- **F3 Write：** **Write** 创建或覆盖文件；写盘前 pending + patch 预览。
- **F4 Grep：** **Grep** 调用现有 `runRipgrep`（`fs-ipc.ts`），结果条数上限（如 500）。
- **F5 Delete / Move：** **Delete**、**Move** 对应 `fs:delete`、`fs:move`/`rename`；写盘前 pending（删除展示路径，移动展示 from→to）。
- **F6 多轮循环：** `agent:send` 在 Main 循环直至模型无 tool 调用或达到 `maxTurns`（建议 10–12）。
- **F7 写前确认：** Edit/Write/Delete/Move 不立即落盘；Renderer 展示 `structuredPatch`（或等价摘要），用户「应用 / 拒绝」后 Main 执行 `fs:*` 并将结果作为 `tool_result` 继续循环。
- **F8 项目门控：** 未打开项目时 Chat 不发起 Agent 回合（与现有「请先打开项目」一致）。

### 非功能需求

- 单文件读/写上界（建议 1MB 量级，与 `research-ide-basics.md` §6 一致）；超限返回明确 tool error。
- Read/Grep 在确认前可自动执行；写类 pending 期间同路径避免与 `chokidar` 自动覆盖冲突（pending 锁或跳过外部 reload）。

### 不在本期（P2）

- **Glob**、**BashTool**、流式 `ai:chatStream`、自动批准写盘设置、会话内持久化 pending、Glob 式 MCP。

---

## 设计决策

### 1. 架构：Main Agent 循环（提案 1）

- **选择：** 循环、工具执行、pending 队列、路径校验均在 **Main**；Renderer 只发 `agent:send`、渲染消息与 diff 卡、调 `confirmWrite`/`rejectWrite`。
- **理由：** 与 `proposal-bid-editor.md` IPC 边界一致；状态不易因刷新丢失；对标 `QueryEngine` 单进程模型。
- **不采用：** 提案 2（Renderer `while` 循环）— IPC 多、pending 易丢。

### 2. 改文件方式：Edit（old/new）而非 unified diff 输入

- **选择：** 对齐 `claude-code` `FileEditTool/types.ts`；落盘前用 npm `diff` 生成 **structuredPatch** 供 UI（参考 `FileEditTool/utils.ts` `getPatchForEdit`）。
- **理由：** 与快照提示词、模型习惯一致；单测可针对替换逻辑。
- **不采用：** 模型直接提交 unified `apply_patch` 作为主路径。

### 3. 删/移：专用工具 + `fs:*`，不用 Bash

- **选择：** **Delete** / **Move** 工具包装现有 IPC。
- **理由：** Electron 桌面应用避免 shell 注入；路径可强制 `isPathInsideRoot`。
- **与快照差异：** Claude Code 常用 Bash `rm`/`mv`；WritCraft 刻意不同。

### 4. 先读后改

- **选择：** Main 维护 `fileReadCache: Set<string>`（按 `projectRoot`+`agent:send` 会话作用域）；Edit 前检查。
- **理由：** 对齐 `FileEditTool/prompt.ts`；减少模型幻觉改未读文件。

### 5. Provider

- **V1：** OpenAI、Anthropic 实现 `chatWithTools`；**Ollama** 无 tools 时隐藏或禁用 Agent 发送并提示换模型。
- **系统提示：** 从 `claude-code/docs/claude-code-system-prompts-zh.md` 摘「专用工具优先、先读后改」短段，附在 agent 首轮 system。

---

## 技术设计

### 1. 核心组件（Main）

```ts
// electron/main/agent/tool-registry.ts
type AgentToolName = 'Read' | 'Edit' | 'Write' | 'Grep' | 'Delete' | 'Move'

type AgentContext = {
  projectRoot: string
  readCache: Set<string>
}

type PendingWrite = {
  id: string
  tool: 'Edit' | 'Write' | 'Delete' | 'Move'
  filePath: string
  structuredPatch?: StructuredPatchHunk[]
  apply: () => Promise<{ ok: true } | { ok: false; error: string }>
}

// electron/main/agent/agent-loop.ts
async function runAgentTurn(input: {
  projectRoot: string
  modelId: string
  messages: AiChatMessage[]
}): Promise<{
  messages: AiChatMessage[]
  pending: PendingWrite[]
  done: boolean
}>
```

### 2. IPC 契约（新增）

| 通道 | 说明 |
|------|------|
| `agent:send` | `{ projectRoot, modelId, messages }` → `{ messages, pending[], status }` |
| `agent:confirmWrite` | `{ pendingId }` → 写盘 + 可选继续 loop 片段或完整新 messages |
| `agent:rejectWrite` | `{ pendingId, reason? }` → tool_result 错误给模型，续跑 |

`preload` / `writcraft.d.ts` 同步扩展。

### 3. 数据流

```
ChatPane.send
  → agent:send
  → [loop] chatWithTools → tool_use
       Read/Grep → execute → tool_result（立即）
       Edit/Write/Delete/Move → 计算 patch → pending（暂停 loop）
  → Renderer ChatDiffCard
  → 用户确认 → agent:confirmWrite → fs:* → tool_result → 恢复 loop
  → 无 tool → 返回最终 assistant 文本
```

### 4. Renderer

| 文件 | 变更 |
|------|------|
| `ChatPane.vue` | `send()` 改 `agent:send`；处理 `pending` |
| `ChatDiffCard.vue`（新建） | 展示 patch、hunk 摘要、应用/拒绝 |
| `ChatToolCard.vue`（新建，可选） | Read/Grep 结果折叠展示 |

写盘成功后：`FileExplorer` 刷新（现有 `onFileChanged` / 手动 refresh）；已打开 tab 由 watch 更新。

### 5. 文件变更清单（实施时唯一改动集）

**新建**

- `electron/main/agent/tool-registry.ts`
- `electron/main/agent/agent-loop.ts`
- `electron/main/agent/agent-context.ts`
- `electron/main/agent/edit-utils.ts`
- `electron/main/agent/tools/read-tool.ts`
- `electron/main/agent/tools/edit-tool.ts`
- `electron/main/agent/tools/write-tool.ts`
- `electron/main/agent/tools/grep-tool.ts`
- `electron/main/agent/tools/delete-tool.ts`
- `electron/main/agent/tools/move-tool.ts`
- `electron/main/ai/chat-with-tools.ts`（或扩展现有 provider 文件）
- `src/components/workbench/ChatDiffCard.vue`
- `tests/unittest/UT-agent-edit/edit-utils.test.ts`

**修改**

- `electron/main/ai-ipc.ts` — 注册 agent IPC
- `electron/main/index.ts` — 引入 agent 注册
- `electron/preload/index.ts`
- `src/types/writcraft.d.ts`
- `src/components/workbench/ChatPane.vue`
- `src/types/writcraft.d.ts` 中 `ChatMessage`（可选 `toolEvents` / `pendingId`）
- `package.json` — 依赖 `diff`（若尚未存在）

**不改**

- `ChatPane` 样式壳、`AgentsPanel` 业务、`fs-ipc.ts` 磁盘语义（仅被 agent 调用）

---

## 实施计划

### 阶段一：Spike + Read + 循环骨架（约 1 人日）

- 对照 `claude-code/docs/src-tools-tutorial-zh.md`、`FileEditTool/types.ts`。
- OpenAI / Anthropic 各测一条 `tools` + `tool_calls` / `tool_use`。
- 实现 `chatWithTools`、`agent-loop` 空壳、`Read` 工具 + `agent:send` 单轮。
- **产出：** 聊天可触发 Read 并在消息区看到文件片段。

### 阶段二：Edit + patch 确认（约 1.5–2 人日）

- `edit-utils.ts`：`replace`、`unique old_string`、`structuredPatch`。
- `Edit` pending + `agent:confirmWrite` / `rejectWrite`。
- `ChatDiffCard.vue` 最小 UI（应用/拒绝）。
- `fileReadCache` 校验。
- **产出：** Read → Edit → 确认 → 磁盘变更可见。

### 阶段三：Write / Grep / Delete / Move + 联调（约 1.5–2 人日）

- 其余四工具接入 registry。
- `ChatPane` 完整 pending 队列（多条顺序确认）。
- 系统提示、错误文案、未打开项目门控。
- 与已打开编辑器、`chokidar` 竞态约定。
- **产出：** 提案 F1–F8 手工清单通过。

### 阶段四：收尾（约 0.5 人日）

- vitest `edit-utils`；更新 `docs/research/research-ide-basics.md` Chat 行（可选）。
- README 一句「聊天 Agent 改文件」说明。

---

## 测试策略

### 单元测试

- `edit-utils`：`old_string` 0 处 / 多处 / 1 处；`replace_all`；换行 `\n` vs `\r\n`；patch 行数。
- `isPathInsideRoot` 拒绝 `../`、项目外绝对路径。
- Mock `executeTool('Read')` 后 `Edit` 无 cache 应失败。

### 集成 / 手工

| 场景 | 预期 |
|------|------|
| 未打开项目发消息 | 不调用 agent 或明确提示 |
| Read `a.md` → Edit 改一行 → 应用 | 磁盘与编辑器一致 |
| Edit 未 Read | tool error，UI 可见 |
| Write 新文件 | pending 全文新增 → 树出现文件 |
| Grep 关键词 | 返回 hits，可再 Read |
| Delete / Move | 确认后树更新 |
| 拒绝 patch | 模型收到失败 tool_result，不写盘 |

---

## 可观测性

（本期从简，无独立 metrics 服务。）

### 日志

- Main：`agent:send` turn 序号、tool 名、path（脱敏仅 basename 亦可）、pending id、confirm/reject。
- 级别：`debug` 循环细节，`warn` 路径拒绝 / patch 失败。

### 指标

- 留空（桌面本地应用，无服务端采集）。

---

## 后续考虑

### 潜在增强

- **Glob**；流式回复；设置项「信任自动写盘」；pending 持久化；checkpoint 回滚。

### 已知限制

- UTF-8 文本为主；大二进制不支持。
- 多 pending 需用户逐个确认，体验待优化。
- 与快照行号格式不完全一致时，模型 Edit 可能需多轮纠错。

---

## 依赖

### 开发依赖

- npm 包 **`diff`**（`structuredPatch`，与快照一致）。
- 现有 **`@vscode/ripgrep`**（Grep 复用 `fs:search`）。

---

## 安全考量

- 所有 `file_path` 经 `path.resolve` + `isPathInsideRoot(projectRoot, …)`；拒绝符号链接逃出（可选：resolve 后二次校验）。
- 写类工具**默认**须用户确认；无 `bypassPermissions`。
- API Key 仅存 `~/.writcraft`，不出 Renderer。
- 不向模型暴露 `node_modules`、`.git` 外敏感路径（Grep glob 与 `fs-ipc` 忽略规则一致）。

---

## 发布策略

1. 功能在 `main` 分支 PR 合并前完成手工清单。
2. 内部 dogfood：标书样例项目跑一轮「新建章节 md + 改标题」。
3. 无单独预发；随 Electron 应用下一版本打包。
4. 发布后观察：patch 拒绝率、Edit 唯一性失败频率（日志）。

---

## 参考资料

- `docs/proposals/proposal-chat-file-agent.md` — 提案全文
- `docs/research/research-claude-code.md` — 工具与架构索引
- `docs/research/research-ide-basics.md` — IPC 与约束
- `docs/proposals/proposal-chat.md` — 聊天现状
- `claude-code/docs/src-tools-tutorial-zh.md`
- `claude-code/src/tools/FileEditTool/`、`FileReadTool/`、`FileWriteTool/`、`GrepTool/`
- `claude-code/src/QueryEngine.ts`
- `electron/main/fs-ipc.ts`、`src/components/workbench/ChatPane.vue`
