# 调研链接

- `docs/deliverables/llm-compact/` — 已完成 Agent 内嵌 LLM 摘要 + 规则回退（2026-06-11）
- `docs/research/research-agent-tools-matrix.md` — §12 compact 行（矩阵仍标「非 LLM 摘要」，待同步）
- `docs/research/research-参考实现.md` — §4.1 `/compact`
- `docs/research/research-axecoder-vs-参考实现.md` — §11 SUMMARIZE_TOOL_RESULTS、上下文压缩缺口
- `electron/main/agent/agent-context-compact.ts` — `compactAgentMessagesWithLlm`、transcript 截断
- `electron/main/agent/agent-loop.ts` — `prepareSessionBeforeModel`：FRC **先于** compact
- `electron/main/agent/agent-frc.ts` — `clearOldToolResults` 占位清理
- `electron/main/chat-compact.ts` — Renderer `/compact` 仍规则截断
- `src/slash-commands/builtin.ts` — `/compact` 走 `chatCompact` 非 Agent LLM 路径
- `electron/main/agent/agent-session-store.ts` — `compactedOnce` 无滚动摘要字段

**调研缺口：** 无专门「长会话质量」量化指标文档；本轮基于代码路径与 llm-compact 遗留项推断根因。
