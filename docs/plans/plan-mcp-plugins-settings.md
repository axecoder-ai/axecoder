# Settings MCP（Plugins）Tab + 内置 Context7 设计文档

> 依据：`docs/proposals/proposal-mcp-plugins-settings.md`（**已确认**，提案 1）  
> **范围：** Settings 新增 **MCP** Tab；内置 Context7 插件（开关 + API Key + 测试连接）；Main 插件注册表与 `mcp-plugins.json`；`loadMcpConfig` 虚拟合并插件层。  
> **约束：** Renderer 不得直接 `fs`；API Key 仅 Main 读写；V1 不做 OAuth / Marketplace / mcp.json 编辑器；Context7 仅远程 HTTP。

## 变更范围、约束与时间线

| 项 | 说明 |
|----|------|
| **范围** | `mcp-plugins-registry` / `store` / `ipc`；`agent-mcp.ts` 合并逻辑；`McpPluginsTab.vue`；`SettingsPanel` Tab；i18n；单测 |
| **不在范围** | Cursor MCP 市场对接；OAuth 授权流；自定义 MCP 表单；Browse 占位；内置 Skill（Phase 2）；Permissions 对 MCP 工具的规则 |
| **约束** | 复用 `~/.axecoder`；密钥键 `mcp:context7` 存 `secrets.json`（0600）；IPC `list` 不返回明文 Key；与 `mcp.json` 同名 `context7` 时以 mcp.json 为准 |
| **时间线（估）** | 阶段一 0.5d → 阶段二 0.5d → 阶段三 0.5d → 阶段四 0.5d，合计 **约 2 人日** |

---

## 当前背景

- **系统：** AxeCoder（Electron + Vue 3）；Agent 已具备 MCP 运行时（`CallMcpTool` / `ListMcpResources` / `ReadMcpResource`）。
- **关键组件：**
  - `electron/main/agent/agent-mcp.ts:22-31` — 多层 `mcp.json` 合并。
  - `electron/main/agent/agent-mcp-runtime.ts` — SDK 连接池（stdio / HTTP）。
  - `src/components/workbench/SettingsPanel.vue` — 设置侧栏 Tab 壳层。
  - `src/components/workbench/ModelsTab.vue` — 列表 + `SwitchToggle` 参考实现。
  - `electron/main/models-ipc.ts` + `secrets-store.ts` — IPC + 密钥范式。
- **痛点：** 用户须手改 `mcp.json` 才能启用 Context7；无 Settings UI；开关与 Key 无统一管理。

---

## 需求

### 功能需求

**P0（本期必须）**

- **P1 MCP Tab：** `SettingsPanel` 侧栏新增 **MCP**；内容区 `McpPluginsTab.vue`。
- **P2 内置 Context7 卡片：** 名称、简短说明、文档链接；**启用开关**；API Key 密码框（保存后 Main 落盘）；**测试连接**按钮。
- **P3 插件状态持久化：** `~/.axecoder/mcp-plugins.json` 仅存 `{ context7: { enabled: boolean } }`，不含密钥。
- **P4 密钥：** `secrets.json` 键 `mcp:context7`；复用 `setSecret` / `getSecret` / `deleteSecret`。
- **P5 运行时合并：** `loadMcpConfig` 读完各层 `mcp.json` 后，对 **enabled 且未与 mcp.json 重名** 的插件 append `McpServerConfig`（url + 注入 header）。
- **P6 冲突处理：** 任意层 `mcp.json` 已含 `context7` 时，UI 显示「已由 mcp.json 配置」，禁用插件开关；列表仍展示状态 `managedBy: 'mcp.json'`。
- **P7 连接池刷新：** `setEnabled` / `setApiKey` 成功后调用 `disconnectMcpServer('context7')`。
- **P8 校验：** 启用但无 Key 时 IPC 返回明确错误；测试连接调用 `getMcpClient` 并校验 tools 含 `resolve-library-id`、`query-docs`（名称允许 SDK 返回的实际 casing）。

**P1（建议同期）**

- **P9 i18n：** `shared/i18n/locales/en.ts`、`zh-CN.ts` Tab 与错误文案。
- **P10 单测：** store CRUD、merge 逻辑（开/关/缺 Key/重名）。

**P2（backlog）**

- 内置 Skill `context7-mcp`；Browse 市场占位；OAuth；Settings 内 mcp.json JSON 编辑。

### 非功能需求

- Tab 打开后 `list` IPC &lt; 100ms（无网络）。
- 测试连接超时沿用 MCP `CONNECT_TIMEOUT_MS`（30s），UI 显示 loading。
- Toggle / 保存 Key 失败时不写半态配置。

---

## 设计决策

### 1. 插件注册表 + 独立状态文件（非直写 mcp.json）

- **选择：** `mcp-plugins-registry.ts` 静态目录 + `mcp-plugins.json` 用户态；运行时 `materializeEnabledPlugins()` 合并。
- **理由：** 与手写 `mcp.json` 解耦；扩展第二内置插件只需加注册项；符合已确认提案。
- **备选（不采用）：** 直写 `mcp.json`（提案 2）— 多插件与 UI 双写风险高。

### 2. Context7 仅远程 HTTP

- **选择：** `url: https://mcp.context7.com/mcp`，header `CONTEXT7_API_KEY` 从 secrets 注入。
- **理由：** Electron 打包后 npx/PATH 不可靠；Context7 官方推荐远程模式。
- **不采用：** stdio `@upstash/context7-mcp`。

### 3. 合并顺序与重名规则

- **选择：** 现有 `mergeMcpServers(layers)` 完成后，若 `byName` 无 `context7` 且插件 enabled + 有 Key，则 append 插件生成的 `McpServerConfig`。
- **理由：** 提案约定 mcp.json 优先；避免覆盖用户/Cursor 已有配置。

### 4. IPC 不向 Renderer 返回明文 Key

- **选择：** `mcpPlugins:list` 返回 `hasApiKey: boolean`；保存 Key 走 `setApiKey` 单向写入。
- **理由：** 对齐 `models` 密钥处理方式。

### 5. UI 参照 ModelsTab

- **选择：** 卡片列表 + `SwitchToggle` + 状态文案；V1 仅一张 Context7 卡片。
- **理由：** 视觉与交互一致，改动面可控。

---

## 技术设计

### 1. 类型

```ts
// electron/main/mcp-plugins-registry.ts
export type McpPluginDefinition = {
  id: string
  serverName: string
  displayName: string
  description: string
  docUrl: string
  url: string
  headerKey: string
  secretKey: string
}

// electron/main/mcp-plugins-store.ts
export type McpPluginState = { enabled: boolean }
export type McpPluginsFile = { schemaVersion: 1; plugins: Record<string, McpPluginState> }

// IPC 返回（Renderer）
export type McpPluginView = {
  id: string
  displayName: string
  description: string
  docUrl: string
  enabled: boolean
  hasApiKey: boolean
  managedBy: 'plugin' | 'mcp.json'
  lastTest?: { ok: boolean; message: string }
}
```

### 2. 核心函数

```ts
// mcp-plugins-registry.ts
export const BUILTIN_MCP_PLUGINS: McpPluginDefinition[] = [CONTEXT7_DEF]

// mcp-plugins-store.ts
export const readMcpPluginsFile(): Promise<McpPluginsFile>
export const setPluginEnabled(id: string, enabled: boolean): Promise<void>
export const isPluginEnabled(id: string): Promise<boolean>

// agent-mcp.ts（新增导出供单测）
export const materializeEnabledPlugins(
  existingNames: Set<string>,
): Promise<McpServerConfig[]>
```

`materializeEnabledPlugins` 逻辑：

1. 遍历 `BUILTIN_MCP_PLUGINS`。
2. 若 `existingNames.has(serverName)` → skip。
3. 若 `!enabled` → skip。
4. `getSecret(secretKey)` 为空 → skip（或 log warn；Agent 侧不注入无 Key  server）。
5. 返回 `{ name: serverName, url, headers: { [headerKey]: key } }`。

### 3. IPC 契约

| Channel | 参数 | 返回 |
|---------|------|------|
| `mcpPlugins:list` | — | `{ ok, plugins: McpPluginView[] }` |
| `mcpPlugins:setEnabled` | `id`, `enabled` | `{ ok } \| { ok: false, error }` |
| `mcpPlugins:setApiKey` | `id`, `apiKey` | `{ ok } \| { ok: false, error }` |
| `mcpPlugins:test` | `id` | `{ ok, tools?: string[] } \| { ok: false, error }` |

`setEnabled(true)` 前校验：非 `managedBy: 'mcp.json'` 且（有 Key 或已有 secrets）；否则拒绝。

`test`：临时构建 `McpServerConfig` → `getMcpClient` → `listTools` → 不断开或 test 后 disconnect（与 toggle 一致则 disconnect）。

### 4. 数据流

```
McpPluginsTab → mcpPlugins:* IPC → mcp-plugins.json / secrets.json
Agent loadMcpConfig → merge mcp.json layers → materializeEnabledPlugins → agent-mcp-runtime
```

### 5. 文件变更（本次唯一改动集）

| 路径 | 操作 |
|------|------|
| `electron/main/mcp-plugins-registry.ts` | 新增 |
| `electron/main/mcp-plugins-store.ts` | 新增 |
| `electron/main/mcp-plugins-ipc.ts` | 新增 |
| `electron/main/agent/agent-mcp.ts` | 修改 |
| `electron/main/index.ts` | 修改（`registerMcpPluginsIpc()`） |
| `electron/preload/index.ts` | 修改 |
| `src/types/axecoder.d.ts` | 修改 |
| `src/components/workbench/McpPluginsTab.vue` | 新增 |
| `src/components/workbench/SettingsPanel.vue` | 修改 |
| `src/App.vue` | 修改（`SettingsTabId` 含 `'mcp'`） |
| `shared/i18n/locales/en.ts` | 修改 |
| `shared/i18n/locales/zh-CN.ts` | 修改 |
| `tests/unittest/UT-mcp-plugins/mcp-plugins-store.test.ts` | 新增 |
| `tests/unittest/UT-mcp-plugins/agent-mcp-plugins-merge.test.ts` | 新增 |

**不修改（V1）：** `agent-mcp-runtime.ts`（`disconnectMcpServer` 已由 IPC 调用，无需改 runtime 本身）、`resources/builtin-skills/`。

---

## 实施计划

### 阶段一：Main 存储与注册表（0.5d）

- 实现 `mcp-plugins-registry.ts`（Context7 常量）。
- 实现 `mcp-plugins-store.ts`（read/write、`schemaVersion: 1`、默认 `{ context7: { enabled: false } }`）。
- 确认 `secrets-store` 泛型 API 可直接用 `mcp:context7`，无需改文件或仅加常量。

### 阶段二：`loadMcpConfig` 合并 + 单测（0.5d）

- 在 `agent-mcp.ts` 提取 `mergeMcpServers` 后的 server 名集合；调用 `materializeEnabledPlugins` append。
- 导出 `materializeEnabledPlugins` 供单测。
- 编写 `UT-mcp-plugins`：enabled/disabled、无 Key、重名 skip、header 注入。

### 阶段三：IPC + preload 类型（0.5d）

- 实现 `mcp-plugins-ipc.ts` 四个 handler；`setEnabled`/`setApiKey` 后 `disconnectMcpServer('context7')`。
- `index.ts` 注册；`preload` + `axecoder.d.ts` 暴露 `listMcpPlugins` / `setMcpPluginEnabled` / `setMcpPluginApiKey` / `testMcpPlugin`。

### 阶段四：Settings UI + i18n + 手工验收（0.5d）

- `McpPluginsTab.vue`：reload on mount、Context7 卡片、SwitchToggle、Key 输入 + Save、Test 按钮、status 文案。
- `SettingsPanel.vue` + `App.vue` 增加 `mcp` Tab。
- i18n 文案。
- 手工：开 Context7 → 填 Key → Test → `/mcp` 或 Agent 调用 → 关开关后不再出现。

---

## 测试策略

### 单元测试

- `mcp-plugins-store`：默认文件、toggle 持久化、schemaVersion。
- `materializeEnabledPlugins`：mock secrets；cases — 全开、全关、无 Key、mcp.json 已有 context7。
- Mock：不发起真实 HTTP；`getMcpClient` 可在 IPC test 层 mock 或仅单测 merge 路径。

### 集成 / 手工

- 真实 Key（开发者本机）：Settings Test → tools 列表含文档查询工具。
- Agent：提问框架 API，观察 `CallMcpTool` 调用 context7。
- 冲突：在 `~/.axecoder/mcp.json` 写入 `context7` 块 → UI 显示 managedBy mcp.json、开关 disabled。

---

## 可观测性

（本期变更影响小，留空。）

- 可选：Main `console.warn` 当 enabled 但缺 Key 时 skip materialize。

---

## 安全考量

- API Key 仅存 `~/.axecoder/secrets.json`，权限 0600；Renderer 仅 `hasApiKey`。
- IPC 不记录 Key 到日志。
- 测试连接不向 Renderer 返回 header 内容。

---

## 发布策略

（不适用独立发布流程；随 AxeCoder 常规版本发布。）

1. 合并前 `npm test` 全绿。
2. 开发环境手工验收 Context7 一条链路。
3. 打包版抽测远程 MCP（确认无 npx 依赖）。

---

## 后续考虑

### 潜在增强

- Phase 2：`resources/builtin-skills/context7-mcp/SKILL.md`。
- Phase 3：Browse 占位、自定义 MCP、OAuth。
- 更新 `docs/research/research-axecoder-vs-claude-code.md` MCP 行。

### 已知限制

- 不能一键同步 Cursor MCP 市场已装插件。
- 无 Key 时启用会被拒绝或运行时 skip，需 UI 提示。
- 多内置插件时 Tab 需列表化（V1 仅 Context7 一张卡片）。

---

## 依赖

### 开发依赖

- 现有 `@modelcontextprotocol/sdk`（已安装）。
- Vitest（现有 `npm test`）。
- Context7 账号与 API Key（手工验收）。

---

## 参考资料

- `docs/proposals/proposal-mcp-plugins-settings.md` — 已确认方案
- `docs/deliverables/agent-mcp-runtime/agent-mcp-runtime-交付总结.md`
- `electron/main/agent/agent-mcp.ts`
- `docs/plans/plan-models-settings-proposal1.md` — Settings / IPC 范式
- [Context7 MCP 文档](https://context7.com/docs/resources/all-clients)
