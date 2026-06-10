# AI Provider 抽象层 设计文档

**desired_location:** `docs/plans/plan-ai-provider-abstraction.md`

## 当前背景

- AxeCoder 有四个 `ModelProvider`，聊天经 `chatWithProvider`、Agent 经 `chatWithToolsForModel` 调用。
- 两门面文件含硬编码 `if (provider === …)`；`chat-with-tools.ts` 内联约 200 行 OpenAI/Anthropic tools 逻辑。
- 能力标志（API Key、SSE）分散在 `models-types.ts` 与 `ChatPane.vue`，新增 Codex 时曾漏改 UI。

## 需求

### 功能需求

- `AiProviderAdapter` 接口：`chat`、`chatWithTools`、`capabilities`。
- 四 Provider 各一 adapter，经 `getProviderAdapter(provider)` 解析。
- 门面仅负责 vision guard、metrics、trace、API Key 前置校验。
- `shared/ai/provider-capabilities.ts` 统一能力元数据；Renderer 与 Main 共用。
- IPC `models:getProviderCapabilities` 暴露能力表。

### 非功能需求

- 不破坏现有四 Provider HTTP wire 行为。
- 现有单测全绿；新增 Registry 单测。
- 最小化对外 API 变更（保留 `chatWithProvider` / `chatWithToolsForModel` 签名）。

## 设计决策

### 1. Registry + Adapter（Strategy）

- 理由：与可行性报告一致；现有 `providers/*.ts` 可包装而非重写。
- 取舍：不做动态插件加载。

### 2. 能力元数据放 shared/

- 理由：Renderer 表单需同步读取 defaultUrl/needsKey，避免双份漂移。
- IPC 作为补充查询接口。

### 3. Ollama tools 委托 OpenAI adapter

- 理由：保持现有 `chatOpenAiWithTools` 行为；Ollama Agent 走 Chat Completions 兼容路径。

## 技术设计

### 1. 核心接口

```typescript
export interface AiProviderAdapter {
  readonly id: ModelProvider
  readonly capabilities: AiProviderCapabilities
  chat(params: PlainChatParams): Promise<AiChatResult>
  chatWithTools(params: ToolsChatParams): Promise<ChatWithToolsResult>
}
```

### 2. 文件变更

| 文件 | 操作 |
|------|------|
| `shared/ai/provider-capabilities.ts` | 新增 |
| `electron/main/ai/provider-types.ts` | 新增 |
| `electron/main/ai/provider-registry.ts` | 新增 |
| `electron/main/ai/adapters/*.ts` | 新增 ×4 |
| `electron/main/ai/chat-with-provider.ts` | 重构 |
| `electron/main/ai/chat-with-tools.ts` | 重构（保留 re-export 兼容单测） |
| `electron/main/models-types.ts` | 委托 shared |
| `electron/main/models-ipc.ts` | 新增 IPC |
| `electron/preload/index.ts` | 暴露 API |
| `src/types/axecoder.d.ts` | 类型 |
| `src/components/workbench/ChatPane.vue` | 用 shared capabilities |
| `src/components/workbench/ModelFormDialog.vue` | 用 shared capabilities |
| `tests/unittest/UT-ai-provider-abstraction/` | 新增 |

## 实施计划

1. **阶段一：基础设施**
   - 创建 shared capabilities、provider-types、四 adapter、registry
   - 单测 Registry

2. **阶段二：门面迁移**
   - 重构 chat-with-provider、chat-with-tools
   - models-types 委托 shared

3. **阶段三：UI/IPC**
   - models:getProviderCapabilities
   - ChatPane、ModelFormDialog 去硬编码

4. **阶段四：回归**
   - 跑全量单测，修复失败项

## 测试策略

- Registry：四 provider 注册、capabilities 字段断言
- 集成：复用 `UT-models-settings/ai-providers.test.ts`
- 回归：`UT-codex-provider`、`UT-openai-messages/chat-with-tools-reasoning.test.ts`
