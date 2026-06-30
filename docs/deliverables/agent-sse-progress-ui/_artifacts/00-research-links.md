# 调研链接

- `src/components/workbench/ChatPane.vue` — `showProgressBubble`、`progress-steps`、`stream-live-text` 当前 UI
- `src/utils/agent-progress.ts` — SSE 进度步聚合与中文 label
- `electron/main/agent/agent-loop.ts` — `emitAgentProgress`（model/tool/delta/subagent）
- `electron/main/agent/agent-progress-emit.ts` — IPC `agent:progress`
- `src/components/workbench/ChatDiffCard.vue` — 工具名 accent 色、紧凑卡片样式参考
- `docs/research/research-axecoder-vs-参考实现.md` §5 — 子代理 UI 进度对比
- 同类 Agent 文档（CLI）：spinner verbs、terminal progress bar、fullscreen TUI（外部参考，仓库无 参考实现 源码）

## 调研缺口

- 本仓库 `参考实现/` 无 CLI 渲染源码；终端工具行样式依据 同类 Agent 公开文档与常见终端 UX（单行工具名 + 参数、活动行 shimmer、推理块弱化）做 IDE 等价实现。
