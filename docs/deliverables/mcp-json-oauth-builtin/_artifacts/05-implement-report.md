# 功能实现报告 — mcp-json-oauth-builtin

## 功能说明

在 `mcp.json` 中配置内置 OAuth 插件（V1：context7）时，自动按 serverName 富化 `oauthPluginId` 与 canonical OAuth URL；支持 API Key 回退与显式 headers 优先。Settings 对 mcp.json 托管的内置 OAuth 插件开放 Connect / Disconnect / Test，不再硬阻断。

## 修改文件列表

| 文件 | 变更 |
|------|------|
| `electron/main/agent/agent-mcp.ts` | 新增 `enrichBuiltinOAuthServers`，接入 `loadMcpJsonLayers` |
| `electron/main/mcp-plugins-ipc.ts` | Connect/Disconnect/Test 适配 mcp.json 托管 |
| `src/components/workbench/McpPluginsTab.vue` | OAuth 插件统一显示操作区 |
| `shared/i18n/locales/en.ts` | `managedByMcpJsonOAuth` |
| `shared/i18n/locales/zh-CN.ts` | `managedByMcpJsonOAuth` |
| `tests/unittest/UT-mcp-plugins/mcp-json-oauth-enrich.test.ts` | 新增 6 条单测 |

## 单测覆盖

- 空配置 context7 → oauthPluginId + oauth URL
- 有 OAuth token → 覆盖自定义 url
- secrets API Key → 非 oauth URL + header
- 已有 headers → 不富化
- 非内置 server → 原样
- loadMcpConfig 集成

## 注意事项

- 仅内置 OAuth 插件；不做任意 server OAuth discovery
- mcp.json 托管时 Connect 成功不写入 `mcp-plugins.json` enabled
- Disconnect 不清除 mcp.json 开关状态
