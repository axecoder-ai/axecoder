# mcp.json 内置插件 OAuth 设计文档

> **状态：** 已确认 | **方案：** 按 serverName 自动富化 | **范围：** 仅内置 OAuth 插件

## 当前背景

- `agent-mcp-auth` 已交付内置插件 OAuth（Settings + McpAuth）。
- `parseMcpServersFromJson` 不富化内置 OAuth；mcp.json 同名 server 跳过插件层。
- `mcp-plugins-ipc` 对 `managedBy === 'mcp.json'` 阻断 Connect。
- Settings UI 仅 `managedBy === 'plugin'` 时显示 Connect 按钮。

## 需求

### 功能需求

- mcp.json 写 `context7`（可空配置）→ `loadMcpConfig` 输出带 `oauthPluginId` 或 API Key headers。
- Settings 对 mcp.json 托管的内置 OAuth 插件可 Connect / Disconnect / Test。
- Agent `McpAuth` 行为不变（已支持 serverName 查找）。
- mcp.json 显式 `headers` 时优先 API Key，不 OAuth 富化。

### 非功能需求

- 最小改动；复用 `mcp-oauth-store` / `connectMcpPluginOAuth`。
- 不做非内置 server 的 OAuth discovery。

## 设计决策

### 1. 富化时机

在 `loadMcpJsonLayers` 返回前对每层 server 调用 `enrichBuiltinOAuthServer`（async）。

### 2. IPC Connect

移除 mcp.json 对 OAuth connect 的阻断；成功后 **不** `setPluginEnabled`（mcp.json 托管）。

### 3. IPC Disconnect

mcp.json 托管时仅 `clearMcpOAuthSession` + `disconnectMcpServer`，不改 `mcp-plugins.json`。

### 4. IPC Test

mcp.json 托管时从 `loadMcpConfig` 取富化后的 server config。

## 技术设计

### 文件变更

| 文件 | 变更 |
|------|------|
| `electron/main/agent/agent-mcp.ts` | `enrichBuiltinOAuthServer(s)` |
| `electron/main/mcp-plugins-ipc.ts` | connect/disconnect/test 分支 |
| `src/components/workbench/McpPluginsTab.vue` | OAuth 操作区 |
| `shared/i18n/locales/en.ts` | 文案 |
| `shared/i18n/locales/zh-CN.ts` | 文案 |
| `tests/unittest/UT-mcp-plugins/mcp-json-oauth-enrich.test.ts` | 新增 |

## 实施计划

1. **单测** — enrich：空配置、有 token、API Key、headers 优先、非内置 server
2. **agent-mcp.ts** — 实现 enrich 并接入 `loadMcpJsonLayers`
3. **mcp-plugins-ipc.ts** — Connect/Disconnect/Test 适配
4. **McpPluginsTab + i18n** — UI 与文案
5. **全量单测** — 确保 UT-mcp-plugins / UT-agent-mcp-auth 通过

## 测试策略

- `mcp-json-oauth-enrich.test.ts`：富化规则矩阵
- `agent-mcp-plugins-merge.test.ts`：补 mcp.json context7 场景
- 手工：mcp.json 配 context7 → Settings Connect → Agent 工具调用

## 发布考量

- 无 schema 迁移；与现有 `~/.axecoder/mcp-oauth.json` 共享 token。
