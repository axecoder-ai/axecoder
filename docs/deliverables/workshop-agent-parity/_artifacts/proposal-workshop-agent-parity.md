**状态：** 已确认

## 已确认方案

Workshop 每角色使用与 **Session Chat Agent** 同源的 `runWorkshopRoleAgentTurn`（完整 `AGENT_TOOLS`、Read/Write/Grep、SSE 经 `agent:progress`）。`sessionId`=`workshop-{id}-{role}`。Workshop 内 Write/Bash 自动 apply（等同 Auto Run）。

**用户明确要求：** 用法与 CHAT 一样，READ/WRITE/GREP 都要有。
