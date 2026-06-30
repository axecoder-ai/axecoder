# 功能实现报告 — ACP 第三方嵌入

## 功能说明

- 新增 `axecoder-acp` CLI（`package.json` bin），stdio ndjson ACP Server
- 基于 `@agentclientprotocol/sdk` 实现 `initialize` / `session/new` / `session/prompt` / `session/cancel`
- 内部 fork `agent-worker`，复用 `send` / `confirm*` / `reject*` / `answerQuestions` / `buildPlan` / `dismissPlan`
- Agent progress 映射为 `session/update`（文本块、工具调用）
- 写文件 / Bash / SmartMode / Ask / Plan 阻塞经 `session/request_permission` 由客户端审批

## 修改文件列表

| 文件 | 说明 |
|------|------|
| `electron/main/acp/acp-tool-mapper.ts` | 工具 kind / prompt 文本 / permission 选项 |
| `electron/main/acp/acp-standalone-bridge.ts` | 无 Electron 的 Worker fork 桥接 |
| `electron/main/acp/acp-host-handlers.ts` | Worker host 回调（progress） |
| `electron/main/acp/acp-session-store.ts` | ACP 会话内存表 |
| `electron/main/acp/create-acp-app.ts` | AgentApp 工厂与 pending 循环 |
| `electron/main/acp-cli.ts` | stdio 入口 |
| `scripts/axecoder-acp.mjs` | npm bin 包装 |
| `vite.config.ts` | 增加 acp-cli entry |
| `package.json` | bin + `@agentclientprotocol/sdk` |
| `tests/unittest/UT-acp-server/*` | 单测 |

## 单测覆盖

- `acp-tool-mapper`：kind 映射、prompt 提取、permission 选项、tool status
- `acp-app`：in-process initialize + session/new

## 注意事项

- 需先 `npm run build`（或 dev 一次）生成 `dist-electron/main/acp-cli.js`
- 模型与 API Key 读 `~/.axecoder/models.json` + secrets；须先在 AxeCoder 配置模型
- AskQuestion V1：permission 后默认选首项（客户端可扩展 `cursor/ask_question`）
- Zed 配置示例：`"command": "axecoder-acp", "args": []`

## 使用

```bash
npx axecoder-acp
# 或 Zed agent_servers:
# "AxeCoder": { "command": "axecoder-acp", "args": [] }
```
