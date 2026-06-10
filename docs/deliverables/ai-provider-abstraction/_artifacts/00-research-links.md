# 调研材料索引

| 文档 | 说明 |
|------|------|
| `docs/feasibility/ai-provider-abstraction-可行性分析报告.md` | 本轮 TELOS 可行性评估，推荐 Registry + Adapter |
| `docs/feasibility/codex-provider-可行性分析报告.md` | 第四 Provider（Codex/Responses）接入触点清单 |
| `electron/main/ai/chat-with-provider.ts` | 当前 plain chat 硬编码分发 |
| `electron/main/ai/chat-with-tools.ts` | 当前 Agent tools 硬编码分发 + 内联 OpenAI/Anthropic |
| `electron/main/ai/providers/*.ts` | 四个 Provider 具体 HTTP 实现 |
| `electron/main/models-types.ts` | ModelProvider 类型与能力函数 |
| `tests/unittest/UT-models-settings/ai-providers.test.ts` | Provider 集成单测 |
| `tests/unittest/UT-codex-provider/*` | Codex Provider 单测 |
