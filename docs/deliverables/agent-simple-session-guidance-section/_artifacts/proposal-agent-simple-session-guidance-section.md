**状态：** 已确认

## 已确认方案

- `getSessionSpecificGuidanceSection(options)`：§8 动态段；默认含 `AskUserQuestion` 被拒说明与 `! <command>` 交互提示；无项时 `null`。
- `buildAgentSystemPrompt(root, sessionGuidanceOptions?)`：顺序 `… → using tools → session guidance → tool rules → project root`。
- 不含 Agent/Explore、Skill、Verification（AxeCoder 当前无对应能力）。

**验证：** Vitest `UT-agent-system-prompt`。
