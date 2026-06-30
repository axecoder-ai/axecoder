# 调研链接

- `docs/research/research-agent-tools-matrix.md` §17 —「mcp.json 通用 OAuth」列为后续项；本轮范围收窄为**仅内置插件**
- `docs/deliverables/agent-mcp-auth/agent-mcp-auth-交付总结.md` §10 — 遗留「任意 mcp.json 自定义 OAuth」；本轮不做
- `electron/main/agent/agent-mcp.ts` — `parseMcpServersFromJson` 未解析 OAuth 字段；mcp.json 同名时跳过插件层
- `electron/main/mcp-plugins-ipc.ts` — `managedBy === 'mcp.json'` 时阻断 Settings Connect
- `electron/main/mcp-plugins-registry.ts` — 内置 OAuth 插件注册表（V1 仅 context7）
- `electron/main/agent/agent-mcp-auth.ts` — `oauthPluginId` 路径已有，但 mcp.json 解析未注入
- `tests/unittest/UT-mcp-plugins/agent-mcp-plugins-merge.test.ts` — 合并与 OAuth 注入单测
