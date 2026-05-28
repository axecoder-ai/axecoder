# 解决方案提案：多模型设置（Cursor 风格）

---

## 解决方案提案

**上下文：**
- **请求：** 将模型配置改为类 Cursor 设置页：左侧 Tab（现阶段可仅 **Models**）、右侧为可搜索/添加的模型列表，每项带启用开关；「添加」按钮弹出对话框录入模型信息；先支持 **OpenAI**、**Ollama**、**Anthropic** 三种协议格式；**全应用配置统一持久化到 `~/.writcraft`**。
- **调研来源：**
  - `docs/research/research-ide-basics.md` — 架构约束（Renderer 不经 `fs`、IPC 经 `window.writcraft`）、设置曾规划为 P1。
  - `docs/proposals/proposal-bid-editor.md` — 多模型配置、主进程代理 AI、`safeStorage`/密钥不落 Renderer。
  - `docs/plans/plan-ide-basics-proposal1.md:250` — 原约定 `electron-store` 仅存 UI 偏好、**不**存 API Key；**与本需求冲突，需以本提案为准迁移到 `~/.writcraft`**。
  - **代码现状（2026-05-28）：**
    - `electron/main/settings-store.ts` — `electron-store` 单套 `aiEndpoint` / `aiModel` / `aiApiKey`（默认在 `app.getPath('userData')`）。
    - `src/components/workbench/ModelSettingsModal.vue` — 单模型三字段弹窗，由 `TitleBar` 齿轮打开。
    - `electron/main/ai-ipc.ts` — 仅 OpenAI Chat Completions 路径（自动补 `/v1`）。
    - `electron/main/chat-store.ts` — 会话存 `userData/chat-sessions.json`，与设置路径不一致。
  - **调研缺口：** 尚无 `docs/research/research-models-settings.md`；`research-ide-basics.md` 未覆盖当前 AI 实现。实施前建议补一篇短调研（各 Provider 请求/响应差异、`~/.writcraft` 与 `userData` 迁移策略）。

---

**提案 1 – 设置全屏面板 + `~/.writcraft` 分文件存储（推荐）**

- **概述：** 用独立 **Settings 面板**（覆盖工作台或独立窗口）替代现有 `ModelSettingsModal`：左侧导航仅 **Models**（预留 General 等 Tab 插槽），右侧为模型列表 + 开关 +「添加模型」；添加/编辑走 **ModelFormDialog**（按 Provider 动态表单项）。主进程新增 `models-store` / `config-store`，统一读写 `~/.writcraft/`；`ai-ipc` 按 `modelId` 选择 Provider 适配器发请求。
- **关键变更：**
  | 模块 | 变更 |
  |------|------|
  | **存储** | `~/.writcraft/config.json`（编辑器：autoSave、fontSize 等）；`~/.writcraft/models.json`（模型列表、enabled、activeModelId）；`~/.writcraft/secrets.json` 或 OS `safeStorage`（apiKey，按 modelId 索引） |
  | **Main** | `electron/main/writcraft-dir.ts` 解析目录；`config-store.ts`、`models-store.ts` 替代/迁移 `settings-store` 中 AI 字段；`ai/providers/{openai,ollama,anthropic}.ts` 适配器；`ai-ipc` 签名改为 `ai:chat(modelId, messages)` |
  | **IPC** | `config:get/set`、`models:list/save/toggle/delete`、`ai:chat`；`src/types/writcraft.d.ts` + `electron/preload/index.ts` 同步 |
  | **Renderer** | `SettingsPanel.vue`（侧栏 + 内容区）；`ModelsTab.vue`（列表、开关、搜索框）；`ModelFormDialog.vue`（provider 下拉 + 条件字段）；`TitleBar` 齿轮 → 打开 Settings 并定位 Models；`ChatPane` 使用 `activeModelId` 与 enabled 列表 |
  | **迁移** | 首次启动：若 `~/.writcraft` 无 `models.json` 且 `electron-store` 有旧 `ai*`，生成一条默认 OpenAI 配置并写入；`chat-sessions.json` 可迁至 `~/.writcraft/chat-sessions.json`（可选同期） |
- **数据模型（示意）：**
  ```ts
  type ModelProvider = 'openai' | 'ollama' | 'anthropic'
  type ModelEntry = {
    id: string
    name: string          // 展示名，如 "DeepSeek"
    provider: ModelProvider
    modelId: string       // API 侧 model 名
    baseUrl: string       // OpenAI/Ollama/Anthropic 各自默认可预填
    enabled: boolean
  }
  // models.json: { activeModelId, models: ModelEntry[] }
  ```
- **Provider 字段（对话框）：**
  | Provider | 必填 | 默认 baseUrl |
  |----------|------|----------------|
  | OpenAI | baseUrl、modelId、apiKey | `https://api.openai.com/v1` |
  | Ollama | baseUrl、modelId；apiKey 可选 | `http://127.0.0.1:11434` |
  | Anthropic | baseUrl、modelId、apiKey | `https://api.anthropic.com` |
- **权衡：**
  - **收益：** 与参考 UI 一致；多模型/开关/扩展 Tab 路径清晰；`~/.writcraft` 便于用户备份与跨机同步；密钥与列表分离更安全。
  - **风险：** 需一次性迁移与回归 `fs:getSettings` 调用方；Anthropic 消息格式与 OpenAI 不同，适配器需单测；设置面板占用布局需定稿（全屏遮罩 vs 独立窗口）。
- **验证：**
  - 单元：`models-store` CRUD、路径 `~/.writcraft` 创建、旧配置迁移。
  - 集成：mock fetch 分别测三种 Provider 的请求头/URL/体；禁用模型后 `ai:chat` 应拒绝。
  - 手工：添加 3 条模型 → 开关切换 → 聊天发消息 → 重启应用配置仍在 `~/.writcraft`。
- **待解决问题：**
  - 是否将 **编辑器设置** 也从 `electron-store` 全量迁入 `config.json`（建议同期，避免双写）。
  - 聊天区模型选择：仅 `activeModelId` 还是下拉切换多条 enabled 模型。
  - 流式回复是否纳入本期（可 Phase 2）。

---

**提案 2 – 最小增量：扩展现有 Modal + `~/.writcraft/models.json`**

- **概述：** 保留 `TitleBar` 齿轮打开的 **单页 Modal**，内部改为「模型列表 + 开关 + 添加」；添加/编辑仍用子对话框 `ModelFormDialog`。主进程仅新增 `~/.writcraft/models.json` + `secrets`，`ai-ipc` 增加 Provider 分支；编辑器偏好继续用 `electron-store`（`userData`）。
- **关键变更：**
  - `ModelSettingsModal.vue` → 列表 UI；新建 `ModelFormDialog.vue`。
  - `electron/main/models-store.ts` + 精简 `ai-ipc` 适配器。
  - **不**引入左侧 Settings Tab 导航；General 仍走 `SettingsModal` + 命令面板。
- **权衡：**
  - **收益：** 改动面小、上线快；满足多模型与三 Provider、`~/.writcraft` 核心诉求。
  - **风险：** 与 Cursor 参考 UI 差距大；后续再加 Tab 需重构 Modal 为 Panel；配置路径分裂（`userData` + `~/.writcraft`）增加支持成本。
- **验证：** 同提案 1 的集成/手工项，范围缩小至 Modal 交互。
- **待解决问题：** 用户明确要求「Models 只是其中一个 tab」时，本方案需二次改版；是否接受短期 UI 债务。

---

**提案 3 – 主进程 AIService + 设置独立窗口**

- **概述：** 按 `proposal-bid-editor.md` 提案 2 思路，将模型注册、Provider 路由、密钥读取收敛为 `electron/main/services/AIService.ts`；设置 UI 为 **独立 BrowserWindow**（或 `child_window`），左侧 Tab 结构同 Cursor；持久化 exclusively `~/.writcraft`，带 `schemaVersion` 便于升级。
- **关键变更：**
  - `AIService.chat(modelId, messages, options?)` 统一出口；IPC 命名空间 `ai:*` / `settings:*`。
  - `SettingsWindow.vue` 独立入口，主窗口 `TitleBar` 仅 `ipc` 打开设置窗。
  - Renderer 聊天仅传 `modelId`，不接触 baseUrl/key。
- **权衡：**
  - **收益：** 边界清晰，利于后续流式、重试、模型路由、选区 AI；密钥安全最佳实践。
  - **风险：** V1 工程量最大；双窗口状态同步（改 active 模型后聊天区刷新）；与当前单窗口 `App.vue` 编排不一致。
- **验证：** AIService 单测 + 设置窗 E2E；与提案 1 相同的 Provider 矩阵。
- **待解决问题：** 是否值得为 V1 引入第二窗口；与 electron-vite 多入口构建配置。

---

## 方案对比摘要

| 维度 | 提案 1（设置面板） | 提案 2（增强 Modal） | 提案 3（AIService + 设置窗） |
|------|-------------------|----------------------|------------------------------|
| 与参考 UI 契合度 | 高 | 低 | 高 |
| 交付周期 | 中（约 2–3 人日） | 短（约 1–1.5 人日） | 长（约 4–5 人日） |
| `~/.writcraft` 统一度 | 高（建议 config+models+secrets 全迁入） | 中（仅模型相关） | 高 |
| 三 Provider 支持 | 适配器模块 | 同左 | 同左，最利于测试 |
| 后续 Tab（General 等） | 自然扩展 | 需重构 | 自然扩展 |
| **推荐** | **首选** | 时间极紧时过渡 | 明确多阶段 AI 路线时 |

**建议：** 采用 **提案 1**。Phase 1 仅实现 **Models** Tab 与迁移；General 可将现有 `SettingsModal` 内容迁入同一面板第二 Tab，或暂时保留双入口并在计划中标注合并。

---

## `~/.writcraft` 目录约定（提案 1/3 共用）

```
~/.writcraft/
  config.json          # 编辑器/UI 偏好（可选从 electron-store 迁移）
  models.json          # 模型列表 + activeModelId（不含密钥）
  secrets.json         # { [modelId]: apiKey }，权限 0600；或改用 safeStorage
  chat-sessions.json   # 可选：从 userData 迁入
```

---

## 调研缺口与后续动作

1. **补调研：** `docs/research/research-models-settings.md` — Anthropic Messages API 与 OpenAI 字段对照、Ollama OpenAI-compat 与原生 `/api/chat` 选型、密钥存储（`secrets.json` vs `safeStorage`）各 OS 行为。
2. **迁移脚本：** 读取 `electron-store` 与 `userData/chat-sessions.json`，写入 `~/.writcraft` 并打日志。
3. **选定方案后：** 使用 `/plan` 产出 `docs/plans/plan-models-settings.md`，再实施。

---
