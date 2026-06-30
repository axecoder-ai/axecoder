# 解决方案提案：聊天上下文「按需检索、不静默附带文件」

---

## 解决方案提案

**上下文：**
- **请求：** 用户未在聊天输入区主动添加的文件，**不要**在发送时自动拼进 prompt；模型应像 同类 Agent 一样，通过**查文件名（Glob）**和 **Grep** 定位内容，再用 **Read** 读取，而不是依赖背景资料侧栏的默认勾选批量注入。
- **调研来源：**
  - `docs/research/research-参考实现.md` — §3 内置工具（`GlobTool` / `GrepTool` / `FileReadTool`）、§3.2「专用工具优先、先读后改」、§4.1 `/files` 与上下文管理；模型被约束用 Glob/Grep 搜索而非预灌全文。
  - `docs/research/research-ide-basics.md` — §2 已有 `fs:search`（ripgrep）未暴露给聊天模型；§6 大文件 UTF-8 全文读入内存约束。
  - `docs/proposals/proposal-chat-file-agent.md` — Agent 工具 Read/Edit/Write/**Grep** 已规划；Glob 标为二期。
  - `docs/proposals/proposal-background-materials.md` — 背景面板「默认带入 AI」与 `ChatPane` 合并 `backgroundContextPaths` 的设计。
- **代码现状（与用户截图一致）：**
  - `BackgroundPanel.vue`：`hydrateIncluded()` 调用 `mergeIncludedWithDefaults(stored, allAiPaths)` — **无 localStorage 时默认勾选全部** `aiContextAllowed` 条目（`src/utils/background-materials.ts:98-102`）。
  - `ChatPane.vue`：`sendFilePaths` 合并 `attachedFiles` + 可选 `contextFilePath` + **`backgroundContextPaths`（静默，输入区 chip 不展示）**（`:279-285`）；发送时 `expandChatUserWithFiles` 把全文塞进 user 消息（`:521-526`）。
  - `electron/main/agent/agent-tool-defs.ts`：Agent 已有 **Read / Grep**，系统提示已写「Use Grep to find files before reading」；**尚无 Glob**。
- **调研缺口：** 无 `docs/research/research-chat-context.md` 专门记录「附件 vs 工具检索」产品决策；背景资料与 Agent 模式是否互斥尚未定稿。实现前建议对真实标书仓库（如 `BIAOSHU`）录屏一次发送链路，确认 token 占用与模型是否仍重复 Read 已注入文件。

---

**提案 1 – 取消静默预载 + 强化 Agent 检索链（推荐，契合度最高）**

- **概述：** **发送链路只保留用户显式附件**（拖拽、`@`、输入区 chip、用户勾选的「当前文件」）；**不再**把 `backgroundContextPaths` 并入 `sendFilePaths`。背景资料侧栏改为**浏览/打开/一键附加**用途，默认**零勾选**。Agent 模式为默认或主推路径：补齐 **Glob**（包装现有 `readTree` 或轻量 glob IPC），系统提示对齐 同类 Agent——「无附件时必须先 Glob/Grep 再 Read」。普通 `ai:chat` 单轮模式若仍需参考文件，由用户手动附加。
- **关键变更：**
  | 模块 | 变更 |
  |------|------|
  | `src/components/workbench/ChatPane.vue` | 从 `sendFilePaths` **移除** `backgroundContextPaths` 循环；可选：发送前若存在未展示的背景路径则 console 断言（防回归） |
  | `src/utils/background-materials.ts` | `mergeIncludedWithDefaults`：无 stored 时返回 **`[]`** 而非 `allAiPaths` |
  | `src/components/workbench/BackgroundPanel.vue` | 文案改为「勾选后点『附加到聊天』」或每轮发送不自动带；保留勾选状态仅用于批量附加按钮 |
  | `electron/main/agent/agent-tool-defs.ts` | 新增 **Glob** 工具 `{ pattern }` → 列相对路径；强化 `buildAgentSystemPrompt`：禁止假设用户消息已含项目文件全文 |
  | `electron/main/agent/tool-executor.ts` | 实现 Glob（复用 `fs-ipc` 树遍历或 ripgrep `--files`） |
  | `src/App.vue` | 可保留 `backgroundContextPaths` ref 供「一键附加」按钮，**不再**默认传给 `ChatPane` 的 send 合并 |
- **权衡：**
  - **收益：** 与用户预期一致（红框文件不再「凭空出现」）；上下文 token 显著下降；行为对齐 `research-参考实现.md` 工具优先；Agent 已具备 Grep，补 Glob 即可覆盖「查文件名」。
  - **风险：** 首轮多 1–2 次 tool 调用，延迟略增；模型若偷懒不搜可能答偏——需系统提示与少量 eval；旧项目 localStorage 若曾保存「全选」需迁移或忽略。
  - **契合度：** 最高 — 最小改动断开静默注入，复用已有 Agent 与 `fs:search`。
- **验证：**
  - **手工：** 打开 `BIAOSHU` → 背景 Tab 全不勾选 → 发「按参数写技术响应」→ 用户消息 **无** `背景资料/参数.md`、`.writcraft/参数汇总.md` tag → Agent 日志出现 Grep/Glob → Read → Write/Edit。
  - **手工：** 仅拖拽 `参数.md` → 发送 → 仅该文件 tag；模型不应再 Grep 同路径（可选优化：附件列表写入 system 一句）。
  - **单测：** `mergeIncludedWithDefaults(null, paths)` → `[]`；`sendFilePaths` 单测不含 background prop。
  - **指标：** 同等任务下 user 消息字符数下降；首 token 延迟 vs 多轮 tool 总耗时对比基线。
- **待解决问题：**
  - Agent 关闭时（纯 `ai:chat`）是否完全禁止无附件长文生成，或提示「请开 Agent / 手动附加」。
  - Glob 与 Grep 结果条数上限（与 `fs:search` 500 条一致？）。
  - `/init` 生成的 `.writcraft/参数汇总.md` 是否应从背景 manifest **排除在默认扫描外**（仅工具可读）。

---

**提案 2 – 背景勾选改为「每轮确认附加」，保留批量能力**

- **概述：** 保留 `backgroundContextPaths` 概念，但**默认空**；侧栏勾选仅表示「候选」；发送时在输入区展示**可折叠的「将附带 N 个背景文件」**条，用户可一键清除或「本次不带」。另增按钮 **「将勾选背景附加到输入」** 把路径推入 `attachedFiles`（与手动拖拽同一通路）。Agent 模式仍用 Glob/Grep/Read，**不**在 `expandChatUserWithFiles` 中静默合并背景。适合仍需「一键带齐招标+参数」的重度用户。
- **关键变更：**
  | 模块 | 变更 |
  |------|------|
  | `ChatPane.vue` | `pendingBackgroundFiles` computed：仅当用户点击「附带背景」或设置项「发送时附带勾选背景」为 on 时并入 `sendFilePaths`；chip UI 与 `attachedFiles` 统一展示 |
  | `BackgroundPanel.vue` | 「附加到聊天」按钮 → `emit('attach-to-chat', paths)`；设置项 `writcraft.background.attachOnSend`（默认 `false`） |
  | `SettingsModal` / `electron-store` | 可选全局：「发送时附带背景勾选（默认关）」 |
  | Agent | 同提案 1 补 Glob + 提示词 |
- **权衡：**
  - **收益：** 保留标书场景「一次带多份参考」工作流，但默认不打扰；UI 透明，解决「看不见却被带上」的困惑。
  - **风险：** 交互多一步；设置项与侧栏勾选状态易混淆；实现量大于提案 1。
  - **契合度：** 中高 — 产品灵活，但违背「最简单：不带就别带」的极简原则。
- **验证：**
  - 默认发送无背景 tag；打开「附带背景」或点按钮后出现 tag；清除后发送无全文块。
  - A/B：新手是否更倾向提案 1 零配置。
- **待解决问题：**
  - 「附加到聊天」是持久 `attachedFiles` 还是仅下一轮。
  - 与 `includeContextFile`（当前编辑文件）的优先级与 dedupe 规则。

---

## 方案对比摘要

| 维度 | 提案 1（取消静默 + Agent 检索） | 提案 2（确认后附加） |
|------|--------------------------------|----------------------|
| 默认行为 | 绝不自动带文件 | 默认不带，可一键/可设置带 |
| 实现量 | 小（删合并 + 改默认勾选 + Glob） | 中（UI + 设置 + 同左） |
| 对齐 同类 Agent | 高 | 高（Agent 段） |
| 标书批量参考 | 需手动附加或 Agent 搜 | 保留批量快捷方式 |
| 用户可见性 | 仅显式 chip | chip + 可选确认条 |

**推荐：提案 1。** 用户诉求明确是「没主动添加就不要带上」；背景侧栏应退化为**目录导航 + 可选一键附加**，检索交给 **Glob → Grep → Read**（`research-参考实现.md` §3）。

---

## 与现有实现的关系

| 已有能力 | 本提案中的角色 |
|----------|----------------|
| `agent-loop.ts` + Read/Grep | 承担「找文件、读内容」主路径 |
| `fs:search` / Grep 工具 | 内容搜索 |
| **缺 Glob** | 提案 1/2 均需补齐「按文件名/路径模式列文件」 |
| `expandChatUserWithFiles` | 仅服务**用户显式** `filePaths` |
| `BackgroundPanel` 默认全选 | **应改为默认空**（根因） |

---

## 建议实施顺序（提案 1）

1. `mergeIncludedWithDefaults` → 默认 `[]`；迁移：首次加载不把历史「全选」写回 storage。
2. `ChatPane.sendFilePaths` 去掉 `backgroundContextPaths`。
3. Main：Glob 工具 + `tool-executor`。
4. 更新 `buildAgentSystemPrompt`（先 Glob/Grep，再 Read；无附件勿臆测文件内容）。
5. 手工验收截图场景（`BIAOSHU` 写技术参数响应）。

---

## 参考索引

| 路径 | 职责 |
|------|------|
| `src/components/workbench/ChatPane.vue:279-285` | 静默合并背景路径 |
| `src/utils/background-materials.ts:98-102` | 默认全选逻辑 |
| `electron/main/agent/agent-tool-defs.ts` | Agent 工具与系统提示 |
| `docs/research/research-参考实现.md` | Glob/Grep/Read 工具优先 |
| `docs/proposals/proposal-chat-file-agent.md` | Agent 文件工具总提案 |
