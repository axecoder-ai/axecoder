# 功能实现报告 — collab-think-fold

## 功能说明

- 协作角色 **thinking** 阶段仅展示 `AgentProgressStream`（推理/工具流），不再与正文气泡重复。
- 角色完成后若有 `reasoningContent`，先落盘 `kind:'reasoning'` 消息（UI **默认折叠**），再 push 正文 `summary`。
- `priorSummary` 与 API 角色 pad 跳过 reasoning 条。
- `speaking` 进度事件改到 speaker 完成之后触发。

## 修改文件列表

| 文件 | 说明 |
|------|------|
| `electron/main/workshop/workshop-types.ts` | `kind`、`RoleSpeakOutput.reasoningContent` |
| `electron/main/workshop/workshop-orchestrator.ts` | 落盘顺序、pad/priorSummary 跳过 |
| `electron/main/agent/agent-loop.ts` | 回合 reasoning 收集并返回 |
| `electron/main/workshop/workshop-agent-speaker.ts` | 透传 reasoning |
| `src/types/axecoder.d.ts` | 前端类型 |
| `src/components/workbench/WorkshopMessageItem.vue` | 可折叠思考块 |
| `src/components/workbench/WorkshopPane.vue` | 进度区与思考动画分流 |
| `tests/unittest/UT-collab-workshop/workshop-orchestrator.test.ts` | 时序与 reasoning 条单测 |

## 单测覆盖

- `speaking` 在 speaker 之后
- `reasoningContent` → `kind:reasoning` 且在 summary 前
- 既有 pad / 全流程用例未回归

## 注意事项

- 无模型 reasoning 时不会出现折叠块，仅正文。
- 工具步骤仍在流式进度中，未写入 reasoning 条（V2 可扩展）。
