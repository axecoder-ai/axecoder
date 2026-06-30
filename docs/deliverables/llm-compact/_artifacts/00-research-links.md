# 调研链接

- `docs/research/research-agent-tools-matrix.md` — §12 上下文 compact（规则压缩，非 LLM 摘要）；§17 P10「LLM 摘要式 compact」
- `docs/research/research-参考实现.md` — §4.1 `/compact` 压缩/摘要上下文
- `docs/research/research-axecoder-vs-参考实现.md` — 上下文自动压缩差距
- `electron/main/agent/agent-context-compact.ts` — 当前规则截断实现
- `electron/main/chat-compact.ts` — Renderer `/compact` 聊天压缩
- `electron/main/agent/agent-loop.ts` — `prepareSessionBeforeModel` 自动 compact 触发点
- `electron/main/ai/chat-with-provider.ts` — 无 tools 的 LLM 调用入口
