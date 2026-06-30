# mcp.json 内置插件 OAuth

---

## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 在 `mcp.json` 中配置内置 OAuth 插件（如 context7）时，应能走通用 OAuth 管线（Settings 连接、Agent `McpAuth`、运行时 `oauthPluginId` 传输），**不扩展**到任意自定义 MCP server 的 OAuth discovery。
- **用户约束：** 仅内置插件。
- **调研来源：** 见 `docs/deliverables/mcp-json-oauth-builtin/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-mcp-json-oauth-builtin.md`
- **选定基础：** 提案 1 – 按 serverName 自动富化（零配置）
- **用户调整摘要：** 无额外调整

### 现状总结

| 场景 | 当前 | 目标 |
|------|------|------|
| mcp.json `{ "context7": {} }` | 无 url/oauthPluginId | 自动注入内置 OAuth 元数据 |
| Settings Connect（mcp.json 托管） | 硬阻断 | OAuth 内置插件允许 Connect |
| 运行时连接 | 裸 HTTP，无 authProvider | 有 token 时带 oauthPluginId |

---

### 最终方案 – 按 serverName 自动富化

- **概述：** `loadMcpJsonLayers` 合并后调用 `enrichBuiltinOAuthServers()`：server 名匹配内置 OAuth 插件时，按 `pluginToServerConfig` 同等规则注入 `oauthPluginId`、canonical URL 或 API Key headers。`mcp-plugins-ipc` 对内置 OAuth 放开 Connect；`setEnabled` 仍阻断 mcp.json 双写。Settings UI 对 mcp.json 托管 OAuth 插件展示 Connect/Disconnect/Test。

- **相对选定提案的变更：** 无。

- **关键变更：**
  - `electron/main/agent/agent-mcp.ts` — `enrichBuiltinOAuthServer(s)`
  - `electron/main/mcp-plugins-ipc.ts` — Connect/Disconnect/Test 适配 mcp.json
  - `src/components/workbench/McpPluginsTab.vue` — mcp.json OAuth 显示操作按钮
  - `shared/i18n/locales/{en,zh-CN}.ts` — 文案微调
  - `tests/unittest/UT-mcp-plugins/mcp-json-oauth-enrich.test.ts` — 新增单测

- **富化规则：**
  1. 仅 `BUILTIN_MCP_PLUGINS` 中 `authMode === 'oauth'` 且 `server.name === def.serverName`
  2. 已有 `headers` → 不改动（尊重 API Key）
  3. 有 `command`（stdio）→ 不改动
  4. 有 OAuth token → `oauthPluginId` + `oauthUrl`
  5. secrets 有 API Key → 非 oauth URL + header
  6. 无凭证 → 仍注入 `oauthPluginId` + `oauthUrl`（供 McpAuth / Connect 触发授权）

- **权衡：** 保留名 `context7` 与内置插件绑定；不做任意 server OAuth discovery。

- **验证：** enrich 单测；loadMcpConfig 集成；IPC connect 不阻断。

- **待解决问题：** 任意 mcp.json 自定义 OAuth（非内置）留后续；更新 research 矩阵条目。

### 未采纳方案说明

- **未选：** 提案 2 – 显式 `oauthPlugin` 字段
- **原因：** 用户选定零配置自动富化；V1 仅 context7 足够。
