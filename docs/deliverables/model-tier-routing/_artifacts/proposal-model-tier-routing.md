# 已确认解决方案提案：模型档位分流

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 复杂任务用主模型（`activeModelId`），简单/探索子任务用快速模型；设置中可配置快速模型；未配置时回退主模型。
- **调研来源：** `docs/deliverables/model-tier-routing/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-model-tier-routing.md`（双方案草稿）
- **选定基础：** 提案 1 – 设置双模型 + 主进程规则分流
- **用户调整摘要：** 保留 `activeModelId` 不变；新增 `fastModelId`；工坊经理/主发言用主模型，explore 子角色与子 Agent 用快速模型。

---

### 最终方案 – 双模型槽位 + 任务类型解析

- **概述：** `models.json` 增加可选 `fastModelId`（指向已启用 `ModelEntry.id`）。新增 `resolveModelIdForTask('main' | 'subagent', modelsFile)`：`subagent` 优先 `fastModelId`，否则 `activeModelId`；`main` 始终 `activeModelId`。`runSubAgentTask`、`Agent` 工具、工坊 `explore` speaker 传 `subagent`；主循环、Chat、工坊非 explore 角色传 `main`。设置「模型」Tab 增加「快速模型（子任务）」下拉。配置项 `agentModelTierRoutingEnabled`（默认 true，可关则全部用 active）。
- **相对选定提案的变更：** 不重命名 `activeModelId`；增加总开关；工坊仅 explore 走 fast。
- **关键变更：**
  - `electron/main/models-types.ts`、`models-store.ts`
  - `electron/main/ai/model-resolve.ts`（新）
  - `electron/main/agent/agent-subagent.ts`、`tool-executor.ts`
  - `electron/main/workshop/workshop-subagent-speaker.ts`
  - `models-ipc.ts`、`preload`、`ModelsTab.vue`、`axecoder.d.ts`
  - `config-store` — `agentModelTierRoutingEnabled`
- **权衡：** 规则分流可能让复杂 explore 仍用快模型；用户可关开关或临时改 fast 为主模型同 id。
- **验证：** `UT-model-tier-routing` 单测 resolve 与回退；现有 agent/workshop 测试不回归。
- **待解决问题：** 后续若需 Agent 工具 `model` 参数走提案 2；主会话按轮次切换主/快（V2）。

### 未采纳方案说明

- **未选：** 提案 2（LLM 选 model）、提案 3（仅子代理无完整设置）— 用户选定提案 1 完整路径。
