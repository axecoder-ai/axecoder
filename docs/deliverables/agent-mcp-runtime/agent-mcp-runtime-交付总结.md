# agent-mcp-runtime 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | agent-mcp-runtime |
| 完成日期 | 2026-06-01 |
| 选定方案 | 提案 1 – Main 进程 MCP SDK 连接池 |
| 审查结论 | 通过 |
| 单测 | 全绿（175/175） |

---

## 1. 概述

**需求：** 将 MCP 从「读 mcp.json + stub 提示去 Cursor IDE」升级为 Main 进程真实 MCP 客户端。

**目标：** `CallMcpTool` / `ListMcpResources` / `ReadMcpResource` 连接已配置服务器；system prompt 动态段列出 tools。

**选型：** 推荐与最终均为提案 1；无额外调整。

**交付目录：** `docs/deliverables/agent-mcp-runtime/`

---

## 2. 方案

见 `_artifacts/proposal-agent-mcp-runtime.md`（**状态：已确认**）。

要点：`@modelcontextprotocol/sdk` 连接池；stdio / SSE / Streamable HTTP；动态 `getMcpInstructionsSection` 含 tools。

---

## 3. 方案选型过程

见 `_artifacts/02-selection.md`。用户选定提案 1，无调整。

---

## 4. 实施计划

见 `_artifacts/plan-agent-mcp-runtime.md`：依赖安装 → runtime 模块 → 接线 → 单测。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。

核心新增 `electron/main/agent/agent-mcp-runtime.ts`；`agent-mcp.ts` 负责配置与对外 API。

---

## 6. 单元测试执行情况

见 `_artifacts/05-unittest.md`。**全绿** — `npm test` 175/175。

---

## 7. 测试报告

- 自动：`UT-agent-mcp-runtime` 覆盖 JSON 解析。
- 手工：配置 `~/.cursor/mcp.json` 后 Agent 调用 `CallMcpTool` / `/mcp`（待用户环境验证）。

---

## 8. 代码审查

见 `_artifacts/06-code-review.md`。**通过**。非阻塞：会话结束断开连接、CI 冒烟、URL 传输自动回退。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `package.json` | 修改 | 添加 @modelcontextprotocol/sdk |
| `electron/main/agent/agent-mcp-runtime.ts` | 新增 | MCP 连接池与协议 |
| `electron/main/agent/agent-mcp.ts` | 修改 | 配置解析 + live API |
| `electron/main/agent/agent-mcp-instructions.ts` | 修改 | 动态 tools 段 |
| `electron/main/agent/agent-ext-executor.ts` | 修改 | 工具执行接线 |
| `electron/main/agent-ipc.ts` | 修改 | /mcp IPC |
| `tests/unittest/UT-agent-mcp-runtime/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

1. Agent 会话结束时调用 `disconnectAllMcpServers`。
2. 对无 `sse` 路径的 URL 连接失败时尝试 SSE 回退。
3. 更新 `research-axecoder-vs-claude-code.md` §2 MCP 行为为「已实现」。

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-agent-mcp-runtime.md` |
| 计划 | `_artifacts/plan-agent-mcp-runtime.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 审查 | `_artifacts/06-code-review.md` |
