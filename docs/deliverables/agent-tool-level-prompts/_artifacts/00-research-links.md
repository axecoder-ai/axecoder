# 调研链接

- `参考实现/docs/参考实现-system-prompts-full.md` — §14 工具级系统提示索引
- `docs/research/research-参考实现.md` — 工具装配与 `prompt.ts` 约定
- `electron/main/agent/agent-tool-defs.ts` — 当前 `AGENT_TOOLS` 短 description
- `electron/main/agent/agent-system-prompt.ts` — §7 `getUsingYourToolsSection`（与 Bash/专用工具分工）
- `electron/main/agent/tool-executor.ts`、`agent-bash.ts`、`agent-subagent.ts` — 运行时行为约束
- `electron/main/ai/chat-with-tools.ts` — `description` / `input_schema` 发往 API

**调研缺口：** 本地 `参考实现` 无 `src/tools/*/prompt.ts` 源码快照；§14 以文档索引 + AxeCoder 已实现能力为准撰写长描述，不声称逐字节 1:1。
