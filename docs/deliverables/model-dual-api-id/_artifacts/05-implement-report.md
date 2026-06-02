# 功能实现报告：model-dual-api-id

## 功能说明

- **添加/编辑模型**：「快速模型 ID」「深度模型 ID」双字段；快速可空（同深度）。
- **自动选档**：主会话 / `ai:chat` / Agent 主循环根据末条 user 文本启发式选 fast/deep API。
- **子任务**：explore/plan 子 Agent、工坊 tester 强制 fast API（同一 `activeModelId` 条目）。
- **废弃**：全局 `fastModelId` 条目下拉、`setFastModel` IPC；读盘时迁移旧 `fastModelId` → `active` 的 `fastApiModelId`。

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/models-types.ts` | `fastApiModelId`；移除 `ModelsFile.fastModelId` |
| `electron/main/models-store.ts` | 保存/迁移 |
| `electron/main/ai/prompt-tier-heuristic.ts` | 启发式 |
| `electron/main/ai/api-model-resolve.ts` | API 名解析 |
| `electron/main/ai/model-resolve.ts` | 条目 id 恒为 active |
| `electron/main/ai/chat-with-*.ts` | `apiModelId` 参数 |
| `electron/main/agent/agent-loop.ts` / `agent-subagent.ts` | 注入 API 名 |
| `electron/main/ai-ipc.ts` / `workshop-llm.ts` | 同上 |
| `ModelFormDialog.vue` / `ModelsTab.vue` | UI |
| `preload` / `axecoder.d.ts` / `models-ipc.ts` | 类型与 IPC 清理 |

## 单测

- `tests/unittest/UT-model-dual-api-id/prompt-tier-heuristic.test.ts`（8）
- 更新 `UT-model-tier-routing/model-resolve.test.ts`（6）

## 注意事项

- `agentModelTierRoutingEnabled=false` 时一律深度 API。
- 启发式可后续调参或接 LLM 分类（V2）。
