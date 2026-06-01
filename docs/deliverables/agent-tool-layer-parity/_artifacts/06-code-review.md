# 代码审查 — agent-tool-layer-parity

## 结论

**通过**（无阻塞项；若干非阻塞后续）

## 功能对照

| 缺口类别 | 状态 |
|----------|------|
| TodoWrite + Task v2 | ✅ 会话内存实现 |
| WebFetch / WebSearch | ✅ Fetch 可用；Search 需配置 |
| NotebookEdit | ✅ .ipynb cell |
| Plan 模式 | ✅ Enter/Exit + 阻断 |
| Skill / DiscoverSkills | ✅ 扫描 .cursor/skills |
| MCP 四工具 | ✅ 配置读取 + stub 响应 |
| TaskOutput / TaskStop | ✅ 后台 Agent + 任务表 |
| ToolSearch | ✅ reveal activeTools |
| LSP / Worktree / Sleep / Brief / Config / Workflow | ✅ stub + feature flag |
| Agent subagent_type / 后台 | ✅ |
| 并行 tool calls | ✅ Promise.all |
| Bash 长规则（git） | ✅ 危险命令拒绝 |

## 阻塞项

无。

## 非阻塞待办

1. 接入 `@modelcontextprotocol/sdk` 实现真实 CallMcpTool / ReadMcpResource。
2. WebSearch 接搜索 API；LSP 接语言服务进程。
3. Renderer Todo/子代理进度 UI。
4. 自定义 agents Markdown 目录（调研 §6 刻意不做项，若产品需要单独立项）。

## 安全

- WebFetch 仅 http(s)；Bash git 危险操作默认拒绝。
- MCP 未执行任意命令，仅读配置。
