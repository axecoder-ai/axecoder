# 调研链接：model-dual-api-id

- `electron/main/models-types.ts` — `ModelEntry.modelId`、`ModelsFile.fastModelId`（条目级 vs 全局快速模型）
- `src/components/workbench/ModelFormDialog.vue` — 添加/编辑模型仅单字段「模型 ID」
- `src/components/workbench/ModelsTab.vue` — 全局「快速模型（子任务）」下拉（`model-tier-routing` 已交付）
- `electron/main/ai/model-resolve.ts` — 按任务类型 `main`/`subagent` 选 **ModelEntry.id**，非 API modelId
- `electron/main/ai/chat-with-provider.ts`、`chat-with-tools.ts` — 调用时使用 `model.modelId` 作为 provider API 名
- `docs/deliverables/model-tier-routing/` — 上一轮双槽位分流（不同 ModelEntry），与本需求「单条目双 API ID + 按问题复杂度」正交/可合并
