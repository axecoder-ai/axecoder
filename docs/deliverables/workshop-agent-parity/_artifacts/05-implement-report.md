# 实现报告

## 功能

- `runWorkshopRoleAgentTurn`：与 `startAgentTurn` 同源 Agent 循环，完整工具集
- `buildAgentRoleSpeaker` 替换 `buildLlmRoleSpeaker` 为默认
- `workshopAutoApply`：Workshop 内 Write/Bash 自动执行
- `WorkshopPane`：`onAgentProgress` + `AgentProgressStream` 工具进度与流式文字

## 文件

- `electron/main/agent/agent-loop.ts`
- `electron/main/agent/tool-executor.ts`
- `electron/main/workshop/workshop-agent-speaker.ts`
- `electron/main/workshop-ipc.ts`
- `src/components/workbench/WorkshopPane.vue`
- `tests/unittest/UT-workshop-agent-parity/workshop-agent-speaker.test.ts`
