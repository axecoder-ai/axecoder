# 调研链接：model-tier-routing

- 对话上下文：用户询问「复杂用高级模型、简单用快速模型」（类 同类 Agent Fast mode / 双模型分流）
- `docs/deliverables/model-settings/model-settings-交付总结.md` — 已有单 `activeModelId`、工坊/Chat 手动选模型
- `electron/main/models-store.ts`、`electron/main/models-types.ts` — `ModelsFile` 仅 `activeModelId` + `models[]`
- `electron/main/agent/agent-loop.ts` — 会话 `session.modelId` 贯穿主循环
- `electron/main/agent/tool-executor.ts`、`agent-subagent.ts` — 子 Agent 复用 `ctx.modelId`
- `electron/main/agent/agent-system-prompt.ts` — 注释写明对标 CC 时**未含 Fast mode**
- `docs/proposals/proposal-models-settings.md` — 多模型存储与 Provider 适配（无档位字段）

**调研缺口：** 无 `research-model-tier-routing.md`；同类 Agent 官方 Fast mode 行为未在本仓文档化，本提案按业界常见「主模型 + 轻量模型 + 子任务走轻量」假设设计。
