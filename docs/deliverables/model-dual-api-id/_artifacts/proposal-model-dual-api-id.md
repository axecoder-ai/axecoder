# 已确认解决方案提案：单模型双 API ID + 自动档位

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 添加/编辑模型含「快速模型 ID」「深度模型 ID」；主会话按问题复杂度自动选用；子任务/探索强制快速 API ID。
- **调研来源：** `docs/deliverables/model-dual-api-id/_artifacts/00-research-links.md`
- **选定基础：** 提案 1 – 启发式复杂度路由
- **用户调整摘要：** 废弃 `ModelsFile.fastModelId` 与设置页全局快速模型下拉；子任务档位改为当前 `activeModelId` 对应条目上的 `fastApiModelId`。

---

### 最终方案 – 单条目双 API ID + 启发式路由

- **概述：** `ModelEntry` 保留 `modelId` 作**深度** API 名，新增可选 `fastApiModelId`（空则与深度相同）。`ModelFormDialog` 双字段；列表展示 `fast / deep`。新增 `prompt-tier-heuristic.ts` 与 `resolveApiModelId(entry, tier, userText?)`：`auto` 用启发式，`fast`/`deep` 强制。`chat-with-provider` / `chat-with-tools` 接受 `apiModelId` 覆盖。Agent 主循环、`ai:chat` 对末条 user 消息用 `auto`；`resolveModelIdForTask(subagent)` 仍返回 `activeModelId`，但调用层传 `tier: fast`。删除 `setFastModel`、ModelsTab 快速下拉、`ModelsFile.fastModelId`；读取时若存在旧 `fastModelId` 可尝试把对应条目的 `modelId` 写入当前 active 的 `fastApiModelId`（一次性迁移）。`agentModelTierRoutingEnabled` 为 false 时一律用深度 API ID。
- **相对选定提案的变更：** 明确废弃全局 fast 条目槽位；`model-resolve` 不再切换 ModelEntry.id。
- **关键变更：** `models-types.ts`、`models-store.ts`、`api-model-resolve.ts`、`prompt-tier-heuristic.ts`、`chat-with-*.ts`、`agent-loop.ts`、`ai-ipc.ts`、`model-resolve.ts`、`ModelFormDialog.vue`、`ModelsTab.vue`、`preload`、`axecoder.d.ts`、单测。
- **权衡：** 启发式误判；与旧 `model-tier-routing` 行为变化（子任务不再换条目）。
- **验证：** `UT-model-dual-api-id`；更新 `UT-model-tier-routing` 为条目内 fast API 行为。
- **待解决问题：** V2 可选 LLM 分类；工坊 LLM 是否对每轮 user 启用 auto。

### 未采纳方案说明

- **未选：** 提案 2 LLM 分类 — 成本与复杂度高，V1 不做。
- **未选：** 提案 3 — 无自动复杂度判断。
