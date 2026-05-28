# 解决方案提案：聊天 Agent 文件工具（对齐本地 `claude-code` 参考实现）

---

## 本地 `claude-code` 是什么、从哪来

WritCraft 根目录有符号链接（**不进 git**）：

```text
claude-code -> /Users/cuiyunfeng/workspace/claude-code
```

见 `.gitignore` 第 28 行、`docs/research/research-claude-code.md` §7。

| 项 | 说明 |
|----|------|
| **性质** | 2026-03-31 备份的 **TypeScript 源码快照**（约 1902 文件），README 写明来自 [instructkr/claude-code](https://github.com/instructkr/claude-code)，系 npm 包 source map 曝光后的研究副本 |
| **用途** | **仅供研究/对齐实现**，非 Anthropic 官方发行物，勿当依赖包引用 |
| **阅读顺序** | `claude-code/src/tools.ts` → `claude-code/src/tools/<Tool>/` → `claude-code/docs/src-tools-tutorial-zh.md` → `QueryEngine.ts`（多轮 tool 循环） |

**本提案改为以该快照中的文件工具体系为准**，而不是自研 unified `apply_patch` 为主路径。

---

## Claude Code 文件方案摘要（应对齐）

来源：`claude-code/src/tools/FileReadTool/`、`FileEditTool/`、`FileWriteTool/`、`GrepTool/`、`GlobTool/`，装配见 `claude-code/src/tools.ts`。

| 工具名（模型侧） | 实现目录 | 作用 |
|------------------|----------|------|
| **Read** | `FileReadTool` | 读文件（带行号前缀）；改前必须先 Read |
| **Edit** | `FileEditTool` | `old_string` + `new_string` + 可选 `replace_all` 做**精确替换**（不是模型直接交 unified diff） |
| **Write** | `FileWriteTool` | `file_path` + `content` 创建或整文件覆盖 |
| **Grep** | `GrepTool` | 项目内 ripgrep（WritCraft 已有 `fs:search` 可对标） |
| **Glob** | `GlobTool` | 按路径模式列文件（V1 可二期） |
| 删 / 移 | 通常 **Bash**（`rm`/`mv`） | 快照里无独立 Delete/Move 文件工具 |

**Edit 与 diff 的关系（重要）：**

- 模型输入是 **字符串替换**（`FileEditTool/types.ts`：`old_string`、`new_string`）。
- 执行成功后，用 `diff` 库的 `structuredPatch` **生成展示用 diff**（`FileEditTool/utils.ts` → `getPatchForEdit`），供 UI 与权限确认——**diff 是结果展示，不是模型主输入格式**。
- `checkPermissions` → 用户批准/拒绝（`FileEditTool.ts` `:125-131`）；`prompt.ts` 要求先 Read、且 `old_string` 在文件中须唯一。

**主循环：** `QueryEngine.ts` 驱动「模型 → tool_use → 执行工具 → tool_result → 再调模型」，直至无 tool 调用。

---

## 解决方案提案

**上下文：**
- **请求：** 聊天（非人手 IDE）能完成项目内文件的**读、创建、删除、修改、移动/重命名**；**实现方案对齐本地 `claude-code` 的 Read / Edit / Write + Grep + 多轮 tool 循环 + 写前权限确认（展示 structuredPatch）**。
- **调研来源：**
  - `docs/research/research-claude-code.md` — §3 内置工具（`FileReadTool` / `FileEditTool` / `FileWriteTool`、`GlobTool` / `GrepTool`）、§3.2 先读后改与破坏性操作确认、§6.3 与 Cursor 对比。
  - `docs/research/research-ide-basics.md` — §2 IPC 契约、§3.1 磁盘层 CRUD 已实现；§6 约束（单根、`isPathInsideRoot`、UTF-8 全文读入）。
  - `docs/proposals/proposal-bid-editor.md` — 架构：Electron + Vue 3，Main `fs:*` IPC，Renderer 不得直接 `fs`。
  - `docs/proposals/proposal-chat.md` — 现状：`ai:chat` 单轮文本；Phase 2 待办含 diff 块 UI。
- **代码现状（静态）：**
  - 磁盘能力：`electron/main/fs-ipc.ts` 已有 `readFile` / `writeFile` / `createFile` / `delete` / `rename` / `move`（`:229-294`）。
  - 路径沙箱：`electron/main/fs-utils.ts` `isPathInsideRoot`（`:18-22`）。
  - 聊天只读上下文：`chat:expandUserWithFiles`（`electron/main/ai-ipc.ts`）、`ChatPane.vue` `send()`（`:258-310`）→ `aiChat` 无 tools。
  - 项目搜索：`fs:search`（ripgrep）已存在，**未暴露给模型**。
- **调研缺口：** 无 `docs/research/research-chat-agent.md`；实现前建议 1–2 天 spike OpenAI/Anthropic tools API，并对照 `claude-code/src/tools/FileEditTool/utils.ts` 移植「替换 + structuredPatch」最小子集。

**目标能力矩阵（对齐 `claude-code`）：**

| 用户目标 | Claude Code | 当前聊天 | V1（对齐快照） |
|----------|-------------|----------|----------------|
| 读 | **Read** | 手动附件 | **Read** 工具 |
| 改 | **Edit**（old/new 替换） | ❌ | **Edit**，写盘前展示 patch |
| 建/覆盖 | **Write** | ❌ | **Write** |
| 删 | Bash `rm` | ❌ | **Delete**（WritCraft 用 `fs:delete`，不用 Bash） |
| 移 | Bash `mv` | ❌ | **Move**（`fs:move`/`rename`） |
| 找 | **Grep** / Glob | ❌ | **Grep**（复用 `fs:search`）；Glob 二期 |

**与快照的刻意差异：** 删/移不用 BashTool（桌面应用安全）；路径一律 `isPathInsideRoot`；无 Bash 也能完成五类操作。

---

**提案 1 – 对齐 `claude-code`：Main Agent 循环 + Read/Edit/Write/Grep/Delete/Move + 写前确认（推荐）**

- **概述：** 在 Main 实现精简版 `buildTool` 注册表（对照 `claude-code/src/Tool.ts`、`src/tools.ts`），工具名与 schema **尽量与快照一致**（`Read` / `Edit` / `Write` / `Grep`）。`agent-loop.ts` 对标 `QueryEngine`：多轮 `chatWithTools` 直到无 tool_use。`Edit`/`Write`/`Delete`/`Move` 在 `call()` 内先算好新内容与 `structuredPatch`（用 npm `diff` 包，同 `FileEditTool/utils.ts`），进入 **pending**；Renderer 展示 patch 卡片，用户确认后写 `fs:*` 并 `tool_result` 续跑。`Read`/`Grep` 立即执行。维护 **fileReadCache**（会话内已 Read 路径），未 Read 则 `Edit` 返回 error（对齐 `prompt.ts` 先读后改）。
- **关键变更：**
  | 模块 | 变更 |
  |------|------|
  | `electron/main/agent/tools/`（新建） | `read-tool.ts`、`edit-tool.ts`、`write-tool.ts`、`grep-tool.ts`、`delete-tool.ts`、`move-tool.ts`；各含 `inputSchema`、`description`（摘自或简化 `claude-code/.../prompt.ts`） |
  | `electron/main/agent/edit-utils.ts`（新建） | 移植思路：`old_string` 唯一性检查、`replace_all`、应用后 `structuredPatch`（参考 `FileEditTool/utils.ts` `getPatchForEdit`） |
  | `electron/main/agent/agent-loop.ts`（新建） | 对标 `QueryEngine` 工具回合 |
  | `electron/main/agent/tool-registry.ts`（新建） | `getTools()` / `executeTool(name, input, ctx)` |
  | `electron/main/ai/` | `chatWithTools`（OpenAI + Anthropic）；Ollama 无 tools 时禁用 Agent 模式 |
  | `electron/main/ai-ipc.ts` | `agent:send`、`agent:confirmWrite`、`agent:rejectWrite` |
  | `ChatPane.vue` | `ChatToolCard.vue` / `ChatDiffCard.vue`（对标 `FileEditTool/UI.tsx` 的批准流） |
  | 系统提示 | 复用 `claude-code/docs/claude-code-system-prompts-zh.md` § 专用工具优先、先读后改 |
  - **工具 schema（与快照对齐，路径用项目内绝对路径）：**
    - **Read** — `{ file_path, offset?, limit? }` → 带行号正文（简化版可无 offset）
    - **Edit** — `{ file_path, old_string, new_string, replace_all? }` → pending + `structuredPatch`
    - **Write** — `{ file_path, content }` → pending（新文件 patch 为全文新增）
    - **Grep** — `{ pattern, path? }` → 调 `runRipgrep`
    - **Delete** — `{ file_path }` → pending（展示「将删除」）
    - **Move** — `{ from_path, to_path }` → pending
- **数据流：**
  ```
  ChatPane.send → agent:send
    → loop: model → tool_use
         Read/Grep → 立即 tool_result
         Edit/Write/Delete/Move → pending（含 structuredPatch）
    → 若有 pending → UI 确认
  用户确认 → fs:* 写盘 → tool_result → 继续 loop
  ```
- **权衡：**
  - **收益：** 与 Claude Code 训练/提示一致，模型更稳；Edit 比 unified diff 更易单测；可直接对照快照排错。
  - **风险：** 移植 `FileEditTool` 边界情况（唯一性、换行、大文件）工作量大；需维护 read-cache。
  - **契合度：** 最高 — 用户明确要求「用那里的方案」。
- **验证：**
  - **单元：** `edit-utils`：`old_string` 不唯一、替换后 patch 行数；路径越界拒绝。
  - **对照：** 同一输入在快照逻辑 vs WritCraft 逻辑下 patch 一致（抽 3 个 fixture）。
  - **手工：** Read → Edit 一段 Markdown → 确认 patch → 磁盘一致；Write 新文件；Move；Delete；拒绝后模型收到 error。
- **待解决问题：**
  - Read 行号前缀格式是否与快照一致（影响 Edit 的 `old_string` 对齐）。
  - 是否 V1 加 **Glob**（快照标配，标书项目可能更需要 Grep）。
  - `fileHistory` / checkpoint（快照有 `fileHistory.ts`）— 本期仅 UI diff 确认，不做 `/rewind`。

---

**提案 2 – Renderer 编排工具循环 + `agent:executeTool` 细粒度 IPC**

- **概述：** Main **不跑**完整 agent 循环，只提供原子能力：`agent:executeTool(projectRoot, name, args)` 与 `agent:buildPatchPreview`；`useAgentChat()` composable（或 `ChatPane` 内）负责：调用 `ai:chatWithTools`（仍可在 Main 单次请求）、解析 `tool_calls`、对写操作展示 diff、再调 `executeTool` 应用。多轮循环在 Renderer 用 `while` 驱动，每轮一次 IPC 往返。
- **关键变更：**
  | 模块 | 变更 |
  |------|------|
  | `src/composables/useAgentChat.ts`（新建） | `sendUserMessage`、`pendingPatches`、`confirmPatch`、turn 计数与 abort |
  | `electron/main/agent-ipc.ts`（新建） | `agent:executeTool`、`agent:previewPatch`；内部复用 `fs-*` 与 `isPathInsideRoot` |
  | `electron/main/ai/chat-with-tools.ts` | 单次 completion + tools，**不**内置 loop |
  | `ChatPane.vue` | 变薄：只绑定 composable；拆 `ChatDiffCard.vue`、`ChatToolLog.vue` |
  | `preload` / 类型 | `executeAgentTool`、`previewAgentPatch` |
- **权衡：**
  - **收益：** UI 状态（展开 diff、取消、重试）全在 Renderer，迭代 diff 卡片快；与 `proposal-chat.md` 提案 2（composable 抽离）方向一致，后续易加流式 token。
  - **风险：** 循环在 Renderer 时 API Key 虽仍在 Main，但 **turn 状态分散**，断网/刷新易丢 pending；IPC 次数 ≈ 轮数 × (1 chat + N tools)，延迟高于提案 1；测试需 mock 更多 IPC。
  - **契合度：** 中高 — 功能可全覆盖，首期复杂度和调试成本高于提案 1。
- **验证：**
  - **单元：** `useAgentChat` 状态机（pending → confirmed → next turn）；mock `executeTool`。
  - **E2E：** 与提案 1 相同手工清单。
  - **对比实验：** 同一 prompt 下提案 1 vs 2 的 IPC 次数与端到端耗时。
- **待解决问题：**
  - 刷新/关窗时 pending patch 是否丢失 acceptable。
  - 是否最终将 loop 下沉 Main（提案 2 作为过渡架构）。
  - `ai:chat` 与 `ai:chatWithTools` 是否合并为一个入口。

---

## 方案对比摘要

| 维度 | 提案 1（Main 循环） | 提案 2（Renderer 循环） |
|------|---------------------|-------------------------|
| 交付速度 | 快（逻辑集中） | 中等（composable + 多 IPC） |
| diff 确认 UX | Renderer 展示，Main 持有 pending | Renderer 全权，更灵活 |
| 安全性 | 路径校验与写盘均在 Main | 依赖每次 `executeTool` 校验 |
| 可测试性 | Main 单测为主 | composable + IPC 契约测试 |
| 与现有代码 | 扩 `ai-ipc` + `ChatPane` | 新建 composable，改 `send` 路径 |
| 长期扩展（流式、MCP） | 易在 Main 加工具池 | 工具池膨胀后 Renderer 过重 |

**推荐：提案 1**，并 **以 `claude-code/` 快照为规范来源** 实现 Read/Edit/Write/Grep，删/移用安全 IPC 替代 Bash。

---

## 与 Claude Code 快照的差距（本提案范围外）

仍不实现：`BashTool`、`AgentTool`、`MCPTool`、`SkillTool`、斜杠命令、`/rewind`、`CLAUDE.md`、完整 `permissions` 规则引擎。交付后覆盖快照中 **文件读写改搜 + 安全删移**，约等于其「改仓库」主路径的 80%（无 Bash 兜底）。

---

## 建议实施顺序（提案 1，对照快照）

1. 阅读并对照：`claude-code/docs/src-tools-tutorial-zh.md`、`FileEditTool/types.ts`、`FileEditTool/prompt.ts`。
2. Spike：`chatWithTools` + 单轮 **Read**。
3. Main：`edit-utils.ts` + **Edit** pending + `structuredPatch`。
4. **Write** / **Grep** / **Delete** / **Move** + `agent-loop`。
5. Renderer：`ChatDiffCard` 批准流 + `fileReadCache` 反馈到 Edit 校验。
6. 系统提示从 `claude-code-system-prompts-zh.md` 摘「先读后改、专用工具」段落。

---

## 参考文件索引

| 路径 | 职责 |
|------|------|
| `claude-code/src/tools.ts` | 工具总装配 |
| `claude-code/src/tools/FileEditTool/` | **Edit** schema、权限、patch |
| `claude-code/src/tools/FileReadTool/` | **Read** |
| `claude-code/src/tools/FileWriteTool/` | **Write** |
| `claude-code/src/tools/GrepTool/` | **Grep** |
| `claude-code/src/QueryEngine.ts` | 多轮 tool 循环 |
| `claude-code/docs/src-tools-tutorial-zh.md` | 工具层教程 |
| `electron/main/fs-ipc.ts` | WritCraft 磁盘 IPC |
| `src/components/workbench/ChatPane.vue` | 发送与消息 UI |
| `docs/research/research-claude-code.md` | 调研索引 |
