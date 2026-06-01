# workshop-chat-align 交付总结

| 任务 | workshop-chat-align |
|------|---------------------|
| 日期 | 2026-06-02 |
| 选定 | 提案 2 — 纯 aiChat |
| 审查 | 通过 |
| 单测 | 206/206 全绿 |

## 概述

Workshop **停用子代理默认路径**，每角色使用与 Session Chat **纯对话** 相同的 `chatWithProvider` + `ai:stream`；避免 max turns 弹窗。与 Chat **Agent 模式**（带工具）不等价。

## 选型

推荐提案 1；**用户选定提案 2**。见 `_artifacts/02-selection.md`。

## 实现要点

- `workshop-ipc` → `buildLlmRoleSpeaker`
- 流式 `workshop-{id}-{role}`
- UI 标签 `Chat`

## 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `workshop-llm.ts` | 修改 | SSE + 提示词 |
| `workshop-ipc.ts` | 修改 | 默认 speaker |
| `WorkshopPane.vue` | 修改 | 文案 |
| `UT-workshop-chat-align/*` | 新增 | 单测 |

## 遗留

需读代码时用主 Chat Agent 或后续落地提案 1。

## 附录

- `_artifacts/02-selection.md`
- `_artifacts/proposal-workshop-chat-align.md`
- `_artifacts/plan-workshop-chat-align.md`
- `_artifacts/05-implement-report.md`
- `_artifacts/05-unittest.md`
- `_artifacts/06-code-review.md`
