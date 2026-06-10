# 新增 Codex（Responses API）Provider

---

## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 像 openai / anthropic / ollama 一样，新增第四 Provider **Codex**，完整适配 OpenAI **Responses API**。
- **调研来源：** `docs/feasibility/codex-provider-可行性分析报告.md`；`electron/main/ai/providers/openai.ts`、`electron/main/ai/chat-with-tools.ts`。
- **选定基础：** 提案 1 – 独立 `codex` Provider + 完整 Responses 适配
- **用户调整摘要：** 无额外调整。

### 现状总结

| 能力 | 状态 |
|------|------|
| openai Provider（Chat Completions） | ✅ |
| anthropic / ollama Provider | ✅ |
| Responses API（`/v1/responses`） | ❌ |
| Codex Provider UI 选项 | ❌ |

---

### 最终方案 – 独立 `codex` Provider

- **概述：** 扩展 `ModelProvider = 'codex'`；新增 `responses-messages.ts`、`responses-sse.ts`、`providers/codex.ts`；在 `chat-with-provider` / `chat-with-tools` 分发；流式与 Agent 与 openai 同级；V1 stateless（`store: false`，全量 `input`）。

- **相对选定提案的变更：** 无。

- **关键变更：**

  | 模块 | 变更 |
  |------|------|
  | `electron/main/models-types.ts` | `codex` 枚举；`defaultBaseUrl`；`providerRequiresApiKey` / `providerSupportsSseStream` |
  | `electron/main/ai/responses-messages.ts` | **新增** wire 转换与 output 解析 |
  | `electron/main/ai/responses-sse.ts` | **新增** Responses SSE 合并 |
  | `electron/main/ai/providers/codex.ts` | **新增** plain + tools |
  | `electron/main/ai/chat-with-provider.ts` | codex 分支 |
  | `electron/main/ai/chat-with-tools.ts` | codex 分支 |
  | `electron/main/ai/parse-token-usage.ts` | `parseResponsesUsage` |
  | `electron/main/ai-ipc.ts` | codex 流式 |
  | `electron/main/agent/agent-loop.ts` | codex 流式 delta |
  | `electron/main/workshop/workshop-llm.ts` | codex 流式 |
  | `src/types/axecoder.d.ts` | 类型同步 |
  | `src/components/workbench/ModelFormDialog.vue` | Codex 选项 + needsKey |
  | `src/components/workbench/ChatPane.vue` | SSE 含 codex |
  | `shared/i18n/locales/{en,zh-CN}.ts` | codexNeedsKey 等 |
  | `tests/unittest/UT-codex-provider/` | **新增** 单测 |

- **V1 默认决策：**
  - Base URL 默认 `https://api.openai.com/v1`；端点 `{base}/responses`
  - System → `role: developer`；工具结果 → `function_call_output`
  - `reasoning.effort` 映射现有 `ReasoningEffortLevel`（auto 不传）
  - Vision：V1 不启用 `supportsVision`（沿用 vision guard）
  - 不做 WebSocket / OAuth / `previous_response_id`

- **验证：**
  - 单测：URL、wire、SSE、mock tool 闭环
  - 手工：添加 codex 模型 → ping → Agent 一轮工具

- **不在范围：** Codex CLI 集成、Responses 代理自建、vision 多模态 wire
