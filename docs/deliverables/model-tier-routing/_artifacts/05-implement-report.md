# 功能实现报告：model-tier-routing

## 功能说明

- 设置 → 模型 Tab 可配置 **快速模型（子任务）**（`fastModelId`），未设置时子任务仍用当前主模型。
- 主进程 `resolveModelIdForTask`：探索类子 Agent（`explore`/`plan`）、工坊 **测试** 角色走快速模型；主会话、`generalPurpose` 子 Agent、工坊经理/后端/前端走主模型。
- `agentModelTierRoutingEnabled`（默认 true）关闭后全部回退 `activeModelId`。

## 修改文件列表

| 文件 | 说明 |
|------|------|
| `electron/main/ai/model-resolve.ts` | 新增解析与任务类型映射 |
| `electron/main/models-types.ts` | `fastModelId`、`agentModelTierRoutingEnabled` |
| `electron/main/models-store.ts` | 读写 fast、`setFastModel`、删除时清理 |
| `electron/main/models-ipc.ts` | `models:setFast` |
| `electron/main/config-store.ts` | 分流开关默认 true |
| `electron/main/agent/tool-executor.ts` | Agent 工具按子类型选模型 |
| `electron/main/workshop/workshop-agent-speaker.ts` | 工坊按角色选模型 |
| `electron/main/workshop/workshop-subagent-speaker.ts` | 同上（遗留 speaker API） |
| `electron/preload/index.ts` | `setFastModel` |
| `src/types/axecoder.d.ts` | 类型与 API |
| `src/components/workbench/ModelsTab.vue` | 快速模型下拉 |
| `tests/unittest/UT-model-tier-routing/model-resolve.test.ts` | 10 例 |

## 单测覆盖

- 解析回退、fast 禁用、分流关闭
- subagentType / 工坊角色映射

## 注意事项

- Chat 主 Agent 仍用会话 `activeModelId`（未做按轮次复杂度切换）。
- 工坊全员经 `buildAgentRoleSpeaker`，仅 `tester` 走快速模型。
