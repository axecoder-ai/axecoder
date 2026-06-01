# 调研链接

- `docs/research/research-axecoder-vs-claude-code.md` — §2 工具层缺口、§7 建议实施顺序
- `docs/research/research-claude-code.md` — §3 内置工具（`getAllBaseTools()` 对齐表）
- `electron/main/agent/agent-tool-defs.ts` — 当前 `AGENT_TOOLS` / `SUB_AGENT_TOOLS`
- `electron/main/agent/agent-tool-prompts.ts` — 工具 description / schema
- `electron/main/agent/tool-executor.ts` — 工具执行分发
- `electron/main/agent/agent-loop.ts` — 多轮循环、pending 批准
- `electron/main/agent/agent-subagent.ts` — 内联子代理
- `electron/main/agent/agent-bash.ts` — Bash 简化实现
- `claude-code/docs/claude-code-system-prompts-full.md` — Claude Code 提示词参考（本地快照）
