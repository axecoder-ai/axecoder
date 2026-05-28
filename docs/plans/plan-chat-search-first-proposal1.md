# 聊天上下文「按需检索、不静默附带文件」设计文档

> 依据：`docs/proposals/proposal-chat-search-first.md` **提案 1**  
> **范围：** 断开背景资料静默注入；发送仅带用户显式附件；Agent 补齐 **Glob** 并强化系统提示。  
> **约束：** Renderer 不经 `fs`；路径限制在 `projectRoot`；最小代码改动。  
> **不实施：** 本文档仅作计划，代码变更在评审后另 PR 完成。

## 变更范围、约束与时间线

| 项 | 说明 |
|----|------|
| **范围** | `mergeIncludedWithDefaults` 默认空；`ChatPane` 不再合并 `backgroundContextPaths`；`agent-fs` + `tool-executor` 新增 **Glob**；`agent-tool-defs` 注册与系统提示；相关单测 |
| **不在范围** | 提案 2（发送前确认条、设置项 `attachOnSend`）；背景侧栏「一键附加到聊天」按钮（可二期）；`ai:chat` 无附件时的强制拦截 UI；流式回复；从 manifest 排除 `参数汇总.md` |
| **约束** | 复用现有 `ripgrep --files`（`background-materials.ts` 已有 `runRipgrepFiles`）；Glob 结果上限与 Grep 对齐（500）；不新增 IPC 通道 |
| **时间线（估）** | **约 0.5–1 人日**：断开注入 0.25d → Glob + 提示词 0.25d → 单测与手工验收 0.25d |

---

## 当前背景

- **痛点：** 用户未在聊天输入区添加文件，发送后消息仍出现 `背景资料/参数.md`、`.writcraft/参数汇总.md` 等 tag——因背景侧栏**默认全选**且 `ChatPane.sendFilePaths` **静默合并** `backgroundContextPaths`，输入区 chip 不展示（`ChatPane.vue:279-285`）。
- **已有能力：** Agent 模式 + `agent:send` 多轮循环；工具 **Read / Edit / Write / Grep / Delete / Move**（`electron/main/agent/`）；`expandChatUserWithFiles` 仅应在用户显式 `filePaths` 时拼全文。
- **缺口：** 无 **Glob**（按路径模式列文件）；系统提示虽写「Use Grep to find files」，未强调「无附件时禁止臆测文件内容」。
- **参考：** `docs/research/research-claude-code.md` §3 — Glob/Grep/Read 工具优先，不预灌全文。

---

## 需求

### 功能需求（P0）

- **F1 默认不勾选背景：** `mergeIncludedWithDefaults(null, allAiPaths)` 返回 `[]`；首次 `hydrateIncluded` 不把「全选」写入 localStorage。
- **F2 发送不带背景：** `sendFilePaths` 仅含 `attachedFiles` + 用户开启的 `contextFilePath`（`includeContextFile`）；**移除**对 `backgroundContextPaths` 的合并。
- **F3 清理无用接线：** `App.vue` 不再向 `ChatPane` 传 `background-context-paths`（或保留 prop 但文档标明废弃，推荐删除 prop 与 `backgroundContextPaths` ref 若暂无「附加」按钮）。
- **F4 Glob 工具：** Agent 可调用 `Glob { pattern }`，返回项目内相对路径列表（`ripgrep --files` + `isPathInsideRoot`）。
- **F5 系统提示：** `buildAgentSystemPrompt` 增加：无用户附件时须 **Glob 或 Grep → Read**；勿假设 user 消息已含项目文件全文；用户已附加的文件路径可列在 system 一句（可选，减重复 Read）。

### 非功能需求

- Glob 返回路径 ≤ 500 条，超出截断并注明。
- 路径一律相对 `projectRoot`，越界返回与 Read 相同的 `PATH_OUTSIDE_PROJECT_ERROR` 语义。

### 不在本期（P2）

- 背景面板「附加到聊天」按钮、`emit('attach-to-chat')`。
- 纯 `ai:chat`（非 Agent）发送时弹窗「请开 Agent 或手动附加」。
- 将 `.writcraft/参数汇总.md` 从背景 manifest 默认扫描排除。

---

## 设计决策

### 1. 断开注入方式

将实施 **直接从 `sendFilePaths` 删除背景合并**，原因如下：

- 根因即 `ChatPane` 静默合并，删循环即可，无需新设置项。
- `BackgroundPanel` 勾选状态仅影响侧栏展示与未来「附加」功能，与发送解耦。
- **不采用** 提案 2 的「每轮确认条」——超出本期范围。

### 2. 默认勾选策略

将实施 **`mergeIncludedWithDefaults` 无 stored 时返回 `[]`**，原因如下：

- 与「没主动添加就不要带上」一致。
- 已有 localStorage「全选」记录的用户：`stored` 非 null 时仍按交集保留，不强制清空（避免惊扰）；新用户与清空 storage 后为默认空。
- **不采用** 迁移脚本批量清空 storage——改动面大且非必须。

### 3. Glob 实现位置

将实施 **在 `agent-fs.ts` 新增 `globProject`，复用 ripgrep `--files`**，原因如下：

- `electron/main/background-materials.ts:40-77` 已有 `runRipgrepFiles` 可抽至 `electron/main/rg-files.ts`（或 `fs-utils.ts`）供背景扫描与 Agent 共用，避免复制 spawn 逻辑。
- **不采用** 新 IPC `fs:glob`——Agent 已在 Main 执行，无需暴露 Renderer。

### 4. App / ChatPane prop 清理

将实施 **删除 `backgroundContextPaths` prop 及 `App.vue` 接线**，原因如下：

- 无发送合并后，ref 无消费者；减少误导。
- `BackgroundPanel` 仍 `emit('update:includedPaths')` 可一并移除，或保留 emit 供二期「附加」按钮使用——**本期推荐移除 emit 与 App ref**，侧栏勾选仅写 localStorage（供将来使用）。

---

## 技术设计

### 1. 核心组件

```ts
// electron/main/agent/agent-fs.ts（新增）
export const globProject = async (
  projectRoot: string,
  pattern: string,
): Promise<{ ok: true; paths: string[] } | { ok: false; error: string }>
// 内部：runRipgrepFiles(projectRoot, pattern) → 转相对路径 → slice(0, 500)

// electron/main/agent/tool-executor.ts
if (name === 'Glob') { /* globProject → 换行拼接相对路径 */ }

// src/utils/background-materials.ts
export const mergeIncludedWithDefaults = (stored: string[] | null, allAiPaths: string[]) => {
  if (!stored) return []  // 原为 return [...allAiPaths]
  ...
}

// src/components/workbench/ChatPane.vue — sendFilePaths
const paths = attachedFiles.value.map((f) => f.path)
if (pendingContextFile.value) paths.push(pendingContextFile.value.path)
return paths
// 删除 backgroundContextPaths 循环
```

### 2. 数据流（发送）

```
用户输入 + 显式 chip（attached / 当前文件）
  → sendFilePaths（无背景）
  → 若有 paths → expandChatUserWithFiles
  → agentSend / aiChat

Agent 无附件时：
  用户消息（纯文本）
  → model 调用 Glob/Grep
  → Read → Edit/Write
```

### 3. Glob 工具 schema

```ts
{
  name: 'Glob',
  description: 'List project files matching a glob pattern (e.g. **/*参数*.md).',
  parameters: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Ripgrep glob, e.g. **/*.md' },
    },
    required: ['pattern'],
  },
}
```

### 4. 文件变更（本期唯一改动集）

| 文件 | 变更 |
|------|------|
| `src/utils/background-materials.ts` | `mergeIncludedWithDefaults` 默认 `[]` |
| `src/components/workbench/ChatPane.vue` | 移除 `backgroundContextPaths` prop 与 `sendFilePaths` 合并 |
| `src/App.vue` | 移除 `backgroundContextPaths` ref 与 `:background-context-paths` |
| `src/components/workbench/BackgroundPanel.vue` | 移除或保留 `update:includedPaths`（若无消费者则删 emit）；勾选文案注明「不自动带入聊天」 |
| `electron/main/agent/agent-types.ts` | `AgentBasicToolName` 增加 `'Glob'` |
| `electron/main/agent/agent-tool-defs.ts` | 注册 Glob；更新 `buildAgentSystemPrompt` |
| `electron/main/agent/agent-fs.ts` | `globProject` |
| `electron/main/agent/tool-executor.ts` | `Glob` 分支 |
| `electron/main/rg-files.ts`（新建，可选） | 从 `background-materials.ts` 抽出 `runRipgrepFiles` |
| `electron/main/background-materials.ts` | 改为 import `runRipgrepFiles`（若抽取） |
| `tests/unittest/UT-background-materials/background-materials.test.ts` | 更新「首次加载」用例期望为 `[]` |

---

## 实施计划

1. **阶段一：断开静默注入（约 2h）**
   - 改 `mergeIncludedWithDefaults` 与单测。
   - `ChatPane` / `App.vue` 移除背景发送合并与 prop。
   - `BackgroundPanel` 文案微调（可选删 `syncIncludedEmit` 若不再需要向 App 上报）。

2. **阶段二：Glob + 提示词（约 2–3h）**
   - 抽取或复制 `runRipgrepFiles` → `globProject`。
   - `agent-types`、`agent-tool-defs`、`tool-executor` 接 Glob。
   - 更新 `buildAgentSystemPrompt`（Glob/Grep 优先、无附件勿臆测）。

3. **阶段三：验收（约 1–2h）**
   - 手工：`BIAOSHU` 背景全不勾选 → 发「按参数写技术响应」→ 用户消息无背景 tag → Agent 日志含 Glob/Grep + Read。
   - 手工：拖拽单文件 → 仅该 tag。
   - 跑 `UT-background-materials` 及相关 vitest。

---

## 测试策略

### 单元测试

- `mergeIncludedWithDefaults(null, ['/a/x.md'])` → `[]`。
- `mergeIncludedWithDefaults(stored, all)` 交集行为不变。
- （可选）`globProject` mock spawn：pattern 合法时返回相对路径列表；超 500 截断。

### 集成 / 手工

| 步骤 | 预期 |
|------|------|
| 新打开项目，背景 Tab | 无默认勾选（或全未勾） |
| 不附加文件，Agent 发送 | 消息区无 `背景资料/*` tag |
| Agent 完成写稿任务 | 工具日志出现 Glob 或 Grep，再 Read |
| 拖拽 `参数.md` 后发送 | 仅 `参数.md` tag |

---

## 可观测性

（本期无新增指标；可选在 Glob/Grep 失败时 `console.warn` 保留现有 `[background]` 风格。）

---

## 后续考虑

### 潜在增强

- 背景侧栏「附加到聊天」→ 写入 `ChatPane.attachedFiles`。
- 用户消息已含 `filePaths` 时，system 提示列出路径，减少重复 Read。
- 纯 `ai:chat` 模式提示开启 Agent。

### 已知限制

- 无附件时依赖模型自觉调用 Glob/Grep，可能偶发答偏。
- 旧用户 localStorage 若仍为「全选」，侧栏仍显示勾选，但**不再**影响发送（F2 保证）。

---

## 依赖

### 开发依赖

- 现有 `@vscode/ripgrep`、`vitest`；无新 npm 包。

---

## 安全考量

- Glob/Grep/Read 均经 `isPathInsideRoot` / `resolvePathInProject`，与现有 Agent 工具一致。
- 不向 Renderer 新增文件列表 IPC。

---

## 发布策略

1. 合并后本地 `npm run dev` 验证 `BIAOSHU` 场景。
2. 打 patch 版本说明：「聊天不再默认附带背景资料；Agent 新增 Glob」。

---

## 参考资料

- `docs/proposals/proposal-chat-search-first.md`
- `docs/research/research-claude-code.md` §3
- `docs/plans/plan-chat-file-agent-proposal1.md`（Agent 基础已实施）
- `src/components/workbench/ChatPane.vue:279-285`
- `electron/main/background-materials.ts:40-77`
