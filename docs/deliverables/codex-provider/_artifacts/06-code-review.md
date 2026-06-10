# 代码审查 — codex-provider

**审查范围：** codex Provider + Responses 适配层  
**对照：** `docs/proposals/proposal-codex-provider.md`、`docs/plans/plan-codex-provider.md`  
**结论：** **通过**（无阻塞项）

---

## 功能

| 项 | 结论 |
|----|------|
| 独立 `codex` Provider | ✅ |
| Responses `/v1/responses` | ✅ |
| Agent tools wire | ✅ |
| 流式 SSE | ✅ |
| UI 选项 | ✅ |
| 不破坏 openai/anthropic/ollama | ✅ |

## 质量

| 项 | 结论 |
|----|------|
| 适配层与 openai 分离 | ✅ |
| 复用 fetchAiWithRetry / consumeOpenAiSse | ✅ |
| 单测 11/11 通过 | ✅ |
| 类型同步 axecoder.d.ts | ✅ |

## 安全

| 项 | 结论 |
|----|------|
| API Key 仍 Main secrets | ✅ |
| 无新增 secrets 明文暴露 | ✅ |

## 非阻塞待办

1. **P2** — `chat-with-provider` 错误文案可改用 i18n `codexNeedsKey`
2. **P2** — Vision：若 Codex 模型需多模态，补 Responses image input wire
3. **P2** — 修复既有 `ai-providers.test.ts` BrowserWindow mock（全仓 4 fail）

## 阻塞项

无。
