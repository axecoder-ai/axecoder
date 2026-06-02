# 功能实现报告

## 功能说明

在 Workshop 编排写入消息时，若新消息的 LLM API 角色（user / assistant）与上一条有效消息相同，先插入 `hidden: true`、`roleId: user`、`text: continue` 的填充消息，避免连续 assistant（多角色连发）或连续 user 导致接口报错。前端 `WorkshopPane` 过滤 `hidden`；`priorSummary` 忽略隐藏消息。

## 修改文件列表

| 文件 | 说明 |
|------|------|
| `electron/main/workshop/workshop-types.ts` | `WorkshopMessage.hidden?` |
| `electron/main/workshop/workshop-orchestrator.ts` | `workshopApiRole`、pad 逻辑、`priorSummary` |
| `src/types/axecoder.d.ts` | 类型同步 |
| `src/components/workbench/WorkshopPane.vue` | 列表不展示 hidden |
| `tests/unittest/UT-collab-workshop/workshop-orchestrator.test.ts` | pad 与映射单测 |

## 单测覆盖

- `workshopApiRole` 映射
- 全流程 `scriptedRoleSpeaker` 后存在 ≥3 条隐藏 continue，且 backend 前一条为 pad

## 注意事项

- 未改动全局 `agentLoopToOpenAiWire`；`runWorkshopRoleAgentTurn` 单轮 tool 链若仍报错需后续提案 1。
- `system` 消息不参与 API 角色计算，员工连发仍会触发 pad。
