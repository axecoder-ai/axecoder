# 功能实现报告

## 功能说明

Software Co. 默认改为 **Fast 单 Session 软 SOP**：

- `sendSopPipelineMessage` 在未设置 `AXECODER_SOP_STRICT=1` 时委托 `sendSopFastPipelineMessage`
- 一次 Developer Agent 回合（`reuseImplementSession` + `sopFast`）完成需求
- `runWorkshopRoleAgentTurn` 在 `sopFast` 时使用 `chatMode: software-company`、工具全开
- 原 MetaGPT 硬编排保留：`AXECODER_SOP_STRICT=1` 走原 `runPipelineFromPhase`

## 修改文件

| 文件 | 说明 |
|------|------|
| `electron/main/sop/sop-fast-pipeline.ts` | 新建 Fast 入口 |
| `electron/main/sop/sop-mode.ts` | `isSopStrictMode` |
| `electron/main/sop/sop-pipeline-engine.ts` | 分发 + 导出 `runSopUserFollowUp` |
| `electron/main/sop/sop-prompts.ts` | `sopSoftOrchestrationPromptBlock` |
| `electron/main/sop/index.ts` | 导出 |
| `electron/main/agent/agent-loop.ts` | `sopFast` 选项 |
| `electron/main/agent/chat-mode.ts` | software-company addon 文案 |
| `electron/main/workshop/workshop-agent-speaker.ts` | sop-fast session key |
| `electron/main/workshop/workshop-subagent-speaker.ts` | fast 跳过硬阶段 prompt |
| `electron/main/workshop/workshop-types.ts` | `sopFast` 字段 |
| `tests/unittest/UT-sop-fast-pipeline/` | 新单测 |
| `tests/unittest/UT-sop-pipeline/` | strict 环境变量 |

## 注意事项

- 严格流水线：`AXECODER_SOP_STRICT=1`
- UI 阶段条在 fast 下可能直接跳到 done（后续可按 artifact checkpoint 优化）
