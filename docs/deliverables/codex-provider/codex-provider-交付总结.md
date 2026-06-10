# codex-provider 交付总结

| 字段 | 内容 |
|------|------|
| **任务名** | codex-provider |
| **完成日期** | 2025-06-10 |
| **选定方案** | 提案 1 — 独立 `codex` Provider + 完整 Responses 适配 |
| **审查结论** | 通过 |
| **特性单测** | 11/11 全绿 |

---

## 1. 概述

**需求：** 像 openai / anthropic / ollama 一样，新增第四 Provider **Codex**，对接 OpenAI **Responses API**，支持聊天、流式与 Agent 工具调用。

**本轮目标：** 实现 `provider: 'codex'`、Responses wire/SSE 层、UI 与单测。

**选型：** 用户指定「新增第四 Provider，完整 Responses 适配」→ 提案 1。

**交付物目录：** `docs/deliverables/codex-provider/`；过程稿 `_artifacts/`。

---

## 2. 方案

**状态：** 已确认

**核心决策：**

- 独立 `codex` Provider，不混入 openai Chat Completions
- Stateless：`store: false`，全量 `input[]`
- System → `developer`；工具 → `function_call` / `function_call_output`
- V1 不做 WebSocket、OAuth、vision wire

**影响范围：** models-types、responses-messages/sse、providers/codex、chat-with-*、ai-ipc、agent-loop、ModelFormDialog、ChatPane、单测。

全文见 `_artifacts/proposal-codex-provider.md`。

---

## 3. 方案选型过程

| 维度 | 提案 1 独立 codex | 提案 2 wireApi | 提案 3 代理 |
|------|-------------------|----------------|-------------|
| 语义清晰度 | 高 | 中 | N/A |
| 工作量 | 大 | 中 | 小 |
| 推荐 | ✅ | — | 临时 |

**用户选择：** 提案 1，无额外调整。

详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

| 阶段 | 内容 |
|------|------|
| 一 | wire + SSE + 单测 |
| 二 | codex provider + chat-with 分支 |
| 三 | 流式 + UI |
| 四 | 回归与交付 |

全文见 `_artifacts/plan-codex-provider.md`。

---

## 5. 实现说明

- 新增 `electron/main/ai/responses-messages.ts`、`responses-sse.ts`、`providers/codex.ts`
- `ModelProvider` 扩展 `'codex'`；`providerRequiresApiKey` / `providerSupportsSseStream` 辅助函数
- Agent / 聊天 / Workshop 流式纳入 codex

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

```bash
npm test -- tests/unittest/UT-codex-provider
```

**11 passed / 0 failed** — 本特性全绿。

全仓 `npm test` 另有 4 个既有失败（BrowserWindow mock），与本轮无关。

详见 `_artifacts/05-unittest.md`、`05-unittest-raw.txt`。

---

## 7. 测试报告

| 类型 | 状态 |
|------|------|
| wire / SSE 单测 | ✅ |
| mock fetch chat + tools | ✅ |
| 真实 API 手工 ping | 待用户有 Key 后验证 |

---

## 8. 代码审查

**结论：通过**，无阻塞项。

非阻塞：i18n codexNeedsKey、vision wire、修复既有 ai-providers mock。

详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/models-types.ts` | 修改 | codex 枚举与 helper |
| `electron/main/ai/responses-messages.ts` | 新增 | wire / parse |
| `electron/main/ai/responses-sse.ts` | 新增 | SSE 合并 |
| `electron/main/ai/providers/codex.ts` | 新增 | chat + tools |
| `electron/main/ai/parse-token-usage.ts` | 修改 | Responses usage |
| `electron/main/ai/chat-with-provider.ts` | 修改 | 分发 |
| `electron/main/ai/chat-with-tools.ts` | 修改 | 分发 |
| `electron/main/ai-ipc.ts` | 修改 | 流式 |
| `electron/main/agent/agent-loop.ts` | 修改 | 流式 |
| `electron/main/workshop/workshop-llm.ts` | 修改 | 流式 |
| `src/types/axecoder.d.ts` | 修改 | 类型 |
| `src/components/workbench/ModelFormDialog.vue` | 修改 | UI |
| `src/components/workbench/ChatPane.vue` | 修改 | SSE |
| `tests/unittest/UT-codex-provider/*` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

1. 有 OpenAI Key 时手工：Settings 添加 codex 模型 → ping → Agent 跑一轮工具
2. P2：Responses vision input
3. P2：修复 `UT-models-settings/ai-providers.test.ts` BrowserWindow mock

---

## 11. 附录：过程文档索引

| 文件 | 说明 |
|------|------|
| `_artifacts/00-research-links.md` | 调研链接 |
| `_artifacts/02-selection.md` | 选型记录 |
| `_artifacts/proposal-codex-provider.md` | 已确认方案 |
| `_artifacts/plan-codex-provider.md` | 实施计划 |
| `_artifacts/05-implement-report.md` | 实现报告 |
| `_artifacts/05-unittest.md` | 单测摘要 |
| `_artifacts/05-unittest-raw.txt` | 单测完整输出 |
| `_artifacts/06-code-review.md` | 代码审查 |
| `docs/feasibility/codex-provider-可行性分析报告.md` | 前置可行性 |
