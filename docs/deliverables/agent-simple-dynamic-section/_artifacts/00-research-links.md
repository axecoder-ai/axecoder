# 调研链接

- `参考实现/docs/参考实现-system-prompts-full.md` — §11 动态段、§15 组装顺序
- `参考实现/src/constants/prompts.ts` — `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`、`dynamicSections`、`computeSimpleEnvInfo`、`getLanguageSection`
- `electron/main/agent/agent-system-prompt.ts` — 现有 §2–§10 + §8 session guidance + project root
- `electron/main/agent/agent-loop.ts` — `buildAgentSystemPrompt(projectRoot)` 注入 system
- `docs/deliverables/agent-simple-session-guidance-section/` — §8 已交付
- `docs/deliverables/agent-simple-output-efficiency-section/` — 明确 §11 未做

## 调研缺口

- AxeCoder 尚无 MCP 接入、Output Style、scratchpad 目录、FRC 运行时、token_budget / brief feature。
- 无 `agentLanguage` 配置项；项目记忆文件约定未统一（可对齐 `AGENTS.md` / `CLAUDE.md` / `.cursor/rules` 只读注入）。
