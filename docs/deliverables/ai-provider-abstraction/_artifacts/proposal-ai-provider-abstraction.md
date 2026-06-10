# 已确认解决方案提案：AI Provider 抽象层

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 建立统一 AI Provider 抽象层，聊天/Agent/流式经抽象接口分发，四 Provider 为具体实现。
- **调研来源：** `docs/feasibility/ai-provider-abstraction-可行性分析报告.md`、`electron/main/ai/chat-with-provider.ts`、`electron/main/ai/chat-with-tools.ts`
- **上游提案：** `docs/proposals/proposal-ai-provider-abstraction.md`（双方案草稿）
- **选定基础：** 提案 1 – Registry + Adapter 分阶段落地
- **用户调整摘要：** **一次性全量交付**——plain chat + tools 下沉 adapter + UI/IPC capabilities 统一，不分阶段迭代。

---

### 最终方案 – Registry + Adapter 全量落地

- **概述：** 定义 `AiProviderAdapter` 接口与静态 Registry；Ollama / Anthropic / OpenAI / Codex 各实现 adapter（包装并下沉现有 `providers/*.ts` 与 `chat-with-tools.ts` 内联逻辑）。`chatWithProvider` / `chatWithToolsForModel` 仅保留横切关注点并调用 adapter。能力元数据集中在 `shared/ai/provider-capabilities.ts`，Main 与 Renderer 共用；另增 `models:getProviderCapabilities` IPC。
- **相对选定提案的变更：**
  - 原提案分 3 阶段；用户要求**本轮一次完成** Phase 1–3。
  - Renderer 采用 `shared/` 同步导入 + IPC 双通道（IPC 供动态查询，shared 供表单默认值）。
- **关键变更：**
  | 模块 | 变更 |
  |------|------|
  | **新增** | `shared/ai/provider-capabilities.ts` — 能力元数据单点 |
  | **新增** | `electron/main/ai/provider-types.ts` — Adapter 接口与参数类型 |
  | **新增** | `electron/main/ai/provider-registry.ts` — Registry |
  | **新增** | `electron/main/ai/adapters/{openai,anthropic,ollama,codex}-adapter.ts` |
  | **重构** | `chat-with-provider.ts`、`chat-with-tools.ts` — 删除 provider 分支 |
  | **重构** | `models-types.ts` — 能力函数委托 shared |
  | **重构** | `models-ipc.ts`、`preload`、`ChatPane.vue`、`ModelFormDialog.vue` |
  | **单测** | `tests/unittest/UT-ai-provider-abstraction/` |
- **权衡：**
  - **收益：** 新 Provider 仅 adapter + Registry；门面无 if-else；能力元数据不再漏改 UI。
  - **风险：** tools 迁移集中 diff，需全量单测回归；本轮工作量大但用户已确认。
- **验证：**
  - `UT-models-settings`、`UT-codex-provider`、`UT-openai-messages` 全绿；
  - 新增 Registry 单测覆盖四 adapter 注册与 capabilities；
  - `grep 'model.provider ==='` 在门面与 ChatPane 为 0。
- **待解决问题：**
  - 第 5 Provider（Gemini 等）纳入同一 Registry 约定（后续）；
  - Ollama Agent tools 长期委托 OpenAI 兼容路径（本轮保持现状，adapter 内显式委托）。

### 未采纳方案说明

- **未选：** 提案 2 – 轻量能力 Registry
- **原因：** 无法实现抽象调用，与用户诉求及可行性报告方案 A 不符。
