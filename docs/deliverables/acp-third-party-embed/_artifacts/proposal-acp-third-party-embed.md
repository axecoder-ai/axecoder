**状态：** 已确认（由 `/create-proposals` 生成）

## 已确认解决方案提案

**上下文：**
- **请求：** 实现 ACP 第三方嵌入，使外部编辑器通过 stdio JSON-RPC 驱动 AxeCoder Agent。
- **调研来源：** `docs/deliverables/acp-third-party-embed/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-acp-third-party-embed.md`（双方案草稿）
- **选定基础：** 提案 1 – 独立 ACP stdio 适配器（`axecoder acp`）
- **用户调整摘要：** 无额外调整

### 最终方案 – 独立 ACP stdio 适配器（`axecoder acp`）

- **概述：** 新增无头 CLI `axecoder acp`，基于 `@agentclientprotocol/sdk` 实现 ACP Server。内部 fork 现有 `agent-worker`，将 ACP `session/prompt`、`session/update`、`session/request_permission` 映射到 Worker `send` / progress / `confirm*` RPC。第三方编辑器配置 `command: axecoder, args: [acp]` 接入。
- **相对选定提案的变更：** 无（按原文落地）
- **关键变更：**
  - `electron/main/acp/`：`acp-server.ts`、`acp-agent-bridge.ts`、`acp-tool-mapper.ts`
  - `electron/main/acp-cli.ts` 或 `scripts/acp-entry.mjs`：CLI 入口
  - `package.json`：`bin`、`@agentclientprotocol/sdk`
  - `tests/unittest/UT-acp-server/`
- **权衡：** 不依赖 Electron 窗口；V1 阻塞工具经 ACP permission 由客户端审批；需处理打包后 bin 路径。
- **验证：** Vitest 协议与映射；Zed `agent_servers` 冒烟。
- **待解决问题：** ACP Registry 上架 V2；`cursor/*` 扩展方法分期。

### 未采纳方案说明

- **未选：** 提案 2 – Electron 桌面内嵌 ACP Server + GUI 审批桥接
- **原因：** 改动面大、需桌面常驻；V1 优先 headless stdio 适配器。
