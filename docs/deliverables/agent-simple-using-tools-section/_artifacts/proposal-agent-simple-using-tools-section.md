**状态：** 已确认

## 已确认方案

- `getUsingYourToolsSection()`：§7 主段英文原文（专用工具 vs Bash、并行/顺序）；不含 TodoWrite/Agent/Skills。
- 新增 `Bash` Agent 工具：`runAgentBash` 在项目根 spawn 非交互命令，超时与输出上限。
- 组装：`actions → using tools → tool path rules → project root`。

**验证：** Vitest 系统提示 + Bash 工具注册/执行单测。
