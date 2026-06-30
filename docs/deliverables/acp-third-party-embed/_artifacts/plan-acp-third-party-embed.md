# ACP 第三方嵌入 — 实施计划

> 依据：`docs/proposals/proposal-acp-third-party-embed.md`（已确认，提案 1）

## 需求

- CLI `axecoder acp`（bin：`axecoder-acp`）stdio ndjson ACP Server
- `@agentclientprotocol/sdk`：`initialize` / `session/new` / `session/prompt` / `session/cancel`
- 内部 fork `agent-worker`，复用 `send` / `confirm*` / `reject*` / `stop`
- progress → `session/update`（`agent_message_chunk`、`tool_call`、`tool_call_update`）
- pending → `session/request_permission` → confirm/reject
- 模型：`models.json` 的 `activeModelId`

## 阶段

1. 依赖与入口：`@agentclientprotocol/sdk`、`acp-cli.ts`、`vite` entry、`package.json` bin
2. `acp-tool-mapper.ts`、`acp-standalone-bridge.ts`、`acp-host-handlers.ts`
3. `create-acp-app.ts`：AgentApp 处理器与 pending 循环
4. `tests/unittest/UT-acp-server/`

## 文件

| 路径 | 操作 |
|------|------|
| `electron/main/acp/acp-tool-mapper.ts` | 新增 |
| `electron/main/acp/acp-standalone-bridge.ts` | 新增 |
| `electron/main/acp/acp-host-handlers.ts` | 新增 |
| `electron/main/acp/acp-session-store.ts` | 新增 |
| `electron/main/acp/create-acp-app.ts` | 新增 |
| `electron/main/acp-cli.ts` | 新增 |
| `scripts/axecoder-acp.mjs` | 新增 |
| `vite.config.ts` | entry |
| `package.json` | bin + 依赖 |
| `tests/unittest/UT-acp-server/` | 新增 |

## 验证

- Vitest：tool 映射、initialize/newSession、permission 选项构建
- 手工：Zed `agent_servers` 配置 `axecoder-acp`
