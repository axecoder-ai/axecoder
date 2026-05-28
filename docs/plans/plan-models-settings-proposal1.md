# 多模型设置（提案 1）设计文档

> 依据：`docs/proposals/proposal-models-settings.md` **提案 1**  
> 调研：`docs/research/research-ide-basics.md`（架构约束）、`docs/proposals/proposal-bid-editor.md`（主进程 AI 代理）  
> **范围：** Cursor 风格设置面板（首期仅 **Models** Tab）、多模型列表与开关、添加/编辑对话框、OpenAI / Ollama / Anthropic 三协议、配置统一落盘 `~/.writcraft`。  
> **约束：** Renderer 不得直接 `fs`；密钥仅 Main 读取；沿用 `window.writcraft` IPC；**不**做流式回复、**不**做选区 AI（Phase 2）。

## 变更范围、约束与时间线

| 项 | 说明 |
|----|------|
| **范围** | `~/.writcraft` 目录与迁移；`config-store` / `models-store`；Provider 适配器；设置全屏面板 UI；`ai:chat(modelId)`；聊天区模型选择与 enabled 校验 |
| **不在范围** | 流式 SSE、模型自动发现/拉列表、General/Cloud Agents 等其它 Tab 实现、独立设置窗口、Pinia、选区联动改稿 |
| **约束** | 单用户本机；UTF-8 JSON；`secrets.json` 权限 `0600`；IPC 不向 Renderer 返回 apiKey；聊天仅调用 **enabled** 且已选中的模型 |
| **时间线（估）** | 阶段一 0.5d → 阶段二 1d → 阶段三 1d → 阶段四 0.5d，合计 **约 3 人日** |

---

## 当前背景

- **系统：** WritCraft（Electron + Vue 3）；AI 聊天已可发消息，但为**单模型**占位实现。
- **关键现状：**
  - `electron/main/settings-store.ts` — `electron-store` 存 `aiEndpoint` / `aiModel` / `aiApiKey`（路径在 `app.getPath('userData')`）。
  - `src/components/workbench/ModelSettingsModal.vue` — 三字段弹窗，由 `TitleBar` 齿轮打开。
  - `electron/main/ai-ipc.ts` — 仅 OpenAI Chat Completions（自动补 `/v1`）。
  - `electron/main/chat-store.ts` — `userData/chat-sessions.json`。
  - `src/components/workbench/SettingsModal.vue` — 编辑器偏好（autoSave、fontSize），命令面板「设置」入口。
- **痛点：** 无法管理多模型与开关；无 Provider 区分；配置分散在 `userData`，不符合「全系统 `~/.writcraft`」；UI 与 Cursor Models 页差距大。

---

## 需求

### 功能需求

**P0（本期必须）**

- **M1 设置面板：** 全屏遮罩层 `SettingsPanel`；左侧导航仅 **Models**（预留 Tab id，便于后续 General）；右侧内容区。
- **M2 模型列表：** 展示 `name`、provider 标签、`modelId`；每项 **启用开关**；支持搜索过滤（本地 filter）。
- **M3 添加/编辑：** 「添加模型」→ `ModelFormDialog`；字段随 Provider 变化；可编辑、删除已有项。
- **M4 三 Provider：** OpenAI（Chat Completions）、Ollama（`/api/chat` 或 OpenAI-compat `/v1/chat/completions`，实施时二选一并写死）、Anthropic（Messages API）。
- **M5 持久化：** 全部写入 `~/.writcraft/`（见下文目录）；启动时自动创建目录；从旧 `electron-store` AI 字段**一次性迁移**。
- **M6 聊天对接：** `ai:chat` 接收 `modelId`；禁用模型不可调用；聊天输入区展示当前模型名，并提供 **下拉切换**（仅 `enabled` 项）。
- **M7 入口：** `TitleBar` 齿轮 → 打开设置面板并选中 Models；关闭面板回到工作台。

**P1（本期建议同期，避免双写）**

- **M8 编辑器配置迁移：** `autoSave` / `autoSaveDelay` / `fontSize` 迁入 `~/.writcraft/config.json`；`fs:getSettings` / `fs:setSettings` 改读新 store（对 Renderer 透明）。
- **M9 会话迁移（可选）：** `chat-sessions.json` 迁至 `~/.writcraft/chat-sessions.json`。

**P2（backlog）**

- General Tab（合并现有 `SettingsModal`）；流式回复；`safeStorage` 替代明文 `secrets.json`；Ollama `tags` 拉取模型列表。

### 非功能需求

- 设置面板打开/关闭 &lt; 200ms（无网络）。
- 单次 `ai:chat` 失败时返回可读错误（HTTP 状态 + 截断 body），不崩溃应用。
- 迁移幂等：重复启动不重复插入默认模型。

---

## 设计决策

### 1. 设置 UI：全屏遮罩，非第二窗口

- **选择：** `SettingsPanel` 作为 `App.vue` 内 `position: fixed` 全屏层，`z-index` 高于工作台。
- **理由：** 与现有单窗口编排一致；实现成本低于 `BrowserWindow`；贴近 Cursor 设置页占满内容区的体验。
- **备选（不采用）：** 独立设置窗口（提案 3）— 留 Phase 2。

### 2. 存储：`~/.writcraft` 分文件，密钥分离

- **选择：**
  - `config.json` — 编辑器偏好 + `schemaVersion`
  - `models.json` — `{ schemaVersion, activeModelId, models: ModelEntry[] }`（无密钥）
  - `secrets.json` — `{ [modelId]: apiKey }`，写入后 `chmod 600`
- **理由：** 可备份、可手工编辑列表；密钥不进入 Renderer；符合提案与用户要求。
- **V1 密钥：** 明文 `secrets.json`（仅 Main 读写）；文档注明后续可换 `safeStorage`。

### 3. Provider 适配器放在 Main

- **选择：** `electron/main/ai/providers/openai.ts`、`ollama.ts`、`anthropic.ts`；`ai-ipc.ts` 按 `model.provider` 分发。
- **理由：** 请求体/头差异大；便于单测 mock `fetch`；Renderer 只传 `modelId`。

### 4. 聊天模型选择：下拉 + `activeModelId`

- **选择：** `models.json` 维护 `activeModelId`；`ChatPane` 下拉切换时 IPC `models:setActive`；发送前校验 `enabled`。
- **理由：** 多模型场景必需；比「仅列表第一个」更符合预期。

### 5. General 设置：本期保留双入口

- **选择：** Models 走新面板；编辑器偏好仍可用命令面板 → 现有 `SettingsModal`，但底层改为读 `config.json`。
- **理由：** 缩小 UI 范围；M8 完成数据统一后，Phase 2 再把 General 迁入同一 `SettingsPanel`。

### 6. 废弃 `ModelSettingsModal`

- **选择：** 实施完成后删除 `ModelSettingsModal.vue`，齿轮只打开 `SettingsPanel`。
- **理由：** 避免两套模型 UI。

---

## 技术设计

### 1. `~/.writcraft` 目录

```
~/.writcraft/
  config.json           # { schemaVersion, autoSave, autoSaveDelay, fontSize }
  models.json           # { schemaVersion, activeModelId, models[] }
  secrets.json          # { [modelId]: string }
  chat-sessions.json    # 可选迁移
```

`electron/main/writcraft-dir.ts`：

- `getWritcraftDir()` → `path.join(os.homedir(), '.writcraft')`
- `ensureWritcraftDir()` — `mkdir` recursive

### 2. 类型（`src/types/writcraft.d.ts`）

```ts
type ModelProvider = 'openai' | 'ollama' | 'anthropic'

type ModelEntry = {
  id: string
  name: string
  provider: ModelProvider
  modelId: string
  baseUrl: string
  enabled: boolean
}

type ModelsFile = {
  schemaVersion: 1
  activeModelId: string
  models: ModelEntry[]
}

type AppConfig = {
  schemaVersion: 1
  autoSave: boolean
  autoSaveDelay: number
  fontSize: number
}
```

`AppSettings`（Renderer 侧）可保留为 `AppConfig` 别名；**移除** `aiEndpoint` / `aiModel` / `aiApiKey`。

### 3. Provider 请求约定（实施要点）

| Provider | URL | 认证 | 备注 |
|----------|-----|------|------|
| OpenAI | `{baseUrl}/chat/completions`（base 可含 `/v1`） | `Authorization: Bearer` | 与现 `ai-ipc` 对齐 |
| Ollama | `{baseUrl}/api/chat` | 无或 Bearer | `stream: false`；body `{ model, messages }` |
| Anthropic | `{baseUrl}/v1/messages` | `x-api-key` + `anthropic-version: 2023-06-01` | 将 OpenAI 风格 `messages` 映射为 Anthropic `messages` |

### 4. IPC / Preload

| 通道 | 说明 |
|------|------|
| `config:get` / `config:set` | 读写 `config.json`（替代 `fs:getSettings` 实现） |
| `models:list` | 返回 `ModelsFile`（无 secrets） |
| `models:save` | 创建/更新条目 + 可选写入 secret |
| `models:delete` | 删条目 + 删对应 secret |
| `models:toggle` | `{ id, enabled }` |
| `models:setActive` | `{ id }` |
| `ai:chat` | `(modelId, messages)` → `AiChatResult` |

`fs:getSettings` / `fs:setSettings` **保留通道名**（减少 Renderer 改动），内部转调 `config-store`。

`WritcraftFs` 扩展：`listModels`、`saveModel`、`deleteModel`、`toggleModel`、`setActiveModel`；`aiChat(modelId, messages)`。

### 5. 迁移（`electron/main/migrate-writcraft.ts`）

启动时 `app.whenReady` 调用一次：

1. `ensureWritcraftDir()`
2. 若无 `models.json` 且 `electron-store` 存在 `aiEndpoint`+`aiModel`+`aiApiKey` → 生成一条 `provider: 'openai'` 的默认项并写入 `secrets.json`
3. 若无 `config.json` 且 `electron-store` 有编辑器字段 → 写入 `config.json`
4. 可选：若 `~/.writcraft/chat-sessions.json` 不存在且 `userData/chat-sessions.json` 存在 → 复制

### 6. Renderer 组件

| 文件 | 说明 |
|------|------|
| `SettingsPanel.vue` | **新建** 全屏设置壳；左侧 Tab；`v-show` Models |
| `ModelsTab.vue` | **新建** 列表、搜索、开关、添加按钮 |
| `ModelFormDialog.vue` | **新建** 添加/编辑；provider 下拉驱动字段 |
| `App.vue` | `settingsPanelVisible`、`settingsTab`；齿轮打开；挂载 `SettingsPanel` |
| `TitleBar.vue` | emit `openSettings`（或保留名 `openModelSettings` 但打开面板） |
| `ChatPane.vue` | 模型下拉、`aiChat(modelId, …)`、未配置/已禁用提示 |
| `ModelSettingsModal.vue` | **删除** |

样式：复用 `var(--wc-*)`；左侧栏宽约 200px，与 Cursor 参考图一致即可。

### 7. 数据流

```
齿轮 → SettingsPanel(Models) → models:save → models.json + secrets.json
聊天选模型 → models:setActive → activeModelId
发送 → ai:chat(modelId, messages) → Provider 适配器 → fetch → 回复写入会话
```

---

## 实施计划

### 阶段一：存储与迁移（约 0.5 人日）

1. 新增 `writcraft-dir.ts`、`config-store.ts`、`models-store.ts`、`secrets-store.ts`、`migrate-writcraft.ts`。
2. `index.ts` 启动时执行迁移；`settings-store.ts` 标记废弃或改为薄封装指向 `config-store`。
3. 单元测试：`models-store` CRUD、迁移幂等（fixture 临时 HOME）。
4. **验收：** 启动后 `~/.writcraft` 存在；旧 AI 配置变为一条模型；`config.json` 含字号等。

### 阶段二：IPC + Provider（约 1 人日）

1. 实现 `openai` / `ollama` / `anthropic` 适配器（各一文件，逻辑直白）。
2. 改写 `ai-ipc.ts`：`ai:chat(modelId, messages)`；校验 enabled + secret（Ollama 可无 key）。
3. 注册 `models:*`、`config:*`；更新 `preload` 与 `writcraft.d.ts`。
4. `fs:getSettings` / `setSettings` 转调 `config-store`；从类型移除 `ai*` 字段。
5. **验收：** 主进程单测或脚本 mock fetch，三 Provider 各一条成功/失败用例。

### 阶段三：设置面板 UI（约 1 人日）

1. `SettingsPanel.vue` + `ModelsTab.vue` + `ModelFormDialog.vue`。
2. 列表开关调 `models:toggle`；添加/编辑调 `models:save`；删除确认。
3. `App.vue` / `TitleBar` 接线；删除 `ModelSettingsModal`。
4. **验收：** 添加 3 种 Provider 各一模型；开关禁用后不可选为 active；重启后列表仍在。

### 阶段四：聊天集成与收尾（约 0.5 人日）

1. `ChatPane` 模型下拉、`setActiveModel`、`aiChat(modelId, …)`。
2. 底部 hint：已配置显示 `name (provider)`，未配置引导点齿轮。
3. 可选：`chat-store` 路径改 `~/.writcraft`。
4. 回归：`useWorkbench` 设置加载、`SettingsModal` 仍可调字号。
5. **验收：** 切换模型发消息走对应 API；禁用模型无法发送；错误信息可见。

---

## 测试策略

### 单元（Vitest，Main 侧纯函数）

- `migrate-writcraft`：空目录、仅有旧 store、已有 `models.json` 不重复写。
- Provider 适配器：mock `global.fetch`，断言 URL、headers、body 关键字段。

### 手工验收（主要）

1. 首次启动迁移后 `~/.writcraft` 三文件存在，`secrets.json` 权限正确。
2. Models 页：增删改、搜索过滤、开关。
3. OpenAI 兼容网关（如 DeepSeek）聊天成功。
4. 本地 Ollama 聊天成功（无 key）。
5. Anthropic 聊天成功（有 key）。
6. 禁用模型后下拉不可选、发送被拒。
7. 重启应用配置不丢。

---

## 可观测性

- Main：`ai:chat` / `models:save` 失败 `console.error` 含 `modelId`、HTTP 状态（**不**打 apiKey）。
- Renderer：聊天失败在 assistant 气泡展示 `error` 文案。

---

## 安全考量

- apiKey **仅** Main 从 `secrets.json` 读取；IPC 响应不含密钥。
- `secrets.json` 写入后 `fs.chmod(0600)`。
- `baseUrl` 仅允许 `http:` / `https:`（防 `file:` 等）。
- 不在 Renderer `localStorage` 存密钥。

---

## 发布策略

- 分阶段合并；阶段二完成后即可内测 AI；阶段三后可演示设置 UI。
- 迁移为向前兼容：旧版 `electron-store` 保留只读，不自动删除（避免降级丢配置）。

---

## 后续考虑

- General Tab 合并 `SettingsModal`。
- 流式 `ai:chatStream` + `ChatPane` 增量渲染。
- `safeStorage` 加密 secrets；Ollama 模型列表 API。

---

## 参考资料

- `docs/proposals/proposal-models-settings.md` — 提案 1 全文
- `docs/plans/plan-ide-basics-proposal1.md` — 计划文档结构参考
- `electron/main/ai-ipc.ts`、`ModelSettingsModal.vue` — 当前实现基线

---
