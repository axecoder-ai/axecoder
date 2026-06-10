# 功能实现报告：AI Provider 抽象层

## 功能说明

建立 `AiProviderAdapter` 接口与静态 Registry，将 Ollama / Anthropic / OpenAI / Codex 四个 Provider 注册为独立 adapter。`chatWithProvider` 与 `chatWithToolsForModel` 不再含 provider 分支，仅负责 vision guard、metrics、trace 与 API Key 前置校验。能力元数据（requiresApiKey、supportsSseStream、defaultBaseUrl）集中在 `shared/ai/provider-capabilities.ts`，Main 与 Renderer 共用；新增 IPC `models:getProviderCapabilities`。

## 修改的文件列表

| 路径 | 变更类型 | 说明 |
|------|----------|------|
| `shared/ai/provider-capabilities.ts` | 新增 | 能力元数据单点 |
| `electron/main/ai/provider-types.ts` | 新增 | Adapter 接口与参数类型 |
| `electron/main/ai/provider-registry.ts` | 新增 | 四 Provider 注册表 |
| `electron/main/ai/adapters/openai-adapter.ts` | 新增 | OpenAI chat + tools |
| `electron/main/ai/adapters/anthropic-adapter.ts` | 新增 | Anthropic chat + tools |
| `electron/main/ai/adapters/ollama-adapter.ts` | 新增 | Ollama chat；tools 委托 openai |
| `electron/main/ai/adapters/codex-adapter.ts` | 新增 | Codex Responses chat + tools |
| `electron/main/ai/chat-with-provider.ts` | 修改 | 薄门面，调 Registry |
| `electron/main/ai/chat-with-tools.ts` | 修改 | 薄门面；re-export 兼容单测 |
| `electron/main/models-types.ts` | 修改 | 能力函数委托 shared |
| `electron/main/models-ipc.ts` | 修改 | 新增 getProviderCapabilities IPC |
| `electron/preload/index.ts` | 修改 | 暴露 getProviderCapabilities |
| `src/types/axecoder.d.ts` | 修改 | AiProviderCapabilities 类型 |
| `src/components/workbench/ChatPane.vue` | 修改 | SSE 判断用 shared |
| `src/components/workbench/ModelFormDialog.vue` | 修改 | defaultUrl/needsKey 用 shared |
| `tests/unittest/UT-ai-provider-abstraction/provider-registry.test.ts` | 新增 | Registry 单测 |
| `tests/unittest/UT-models-settings/ai-providers.test.ts` | 修改 | mock renderer-broadcast |

## 单元测试覆盖情况

- Registry 四 Provider 注册与 capabilities 一致性
- 既有 `UT-models-settings/ai-providers`、`UT-codex-provider`、`UT-openai-messages` 回归
- `models-ping`、`workshop-llm` 间接调用门面回归

## 注意事项

- Ollama Agent tools 继续委托 `openAiAdapter.chatWithTools`（与重构前行为一致）。
- `chatOpenAiWithTools` / `chatAnthropicWithTools` 从 `chat-with-tools.ts` re-export，兼容现有单测导入路径。
- 全量 `npm test` 有 2 个与本轮无关的既有失败（agent-tool-level-prompts、bash-integration）；本轮相关 27 项单测全绿。
