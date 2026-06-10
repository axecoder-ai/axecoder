# Settings MCP（Plugins）管理 Tab + 内置 Context7

---

## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 在 Settings 中新增 **MCP（Plugins）** Tab，提供插件式 MCP 管理 UI；**内置 Context7**，支持开关启用/禁用；用户无需手改 JSON 即可接入文档查询能力。
- **调研来源：**
  - `docs/deliverables/agent-mcp-runtime/agent-mcp-runtime-交付总结.md` — Main 进程 MCP SDK 连接池已交付。
  - `electron/main/agent/agent-mcp.ts:22-31` — 多层 `mcp.json` 合并路径。
  - `electron/main/agent/agent-mcp-runtime.ts:34-55` — stdio / Streamable HTTP / SSE 传输。
  - `src/components/workbench/SettingsPanel.vue` — Settings Tab 壳层；`ModelsTab.vue` — 列表 + 开关参考。
  - `electron/main/secrets-store.ts` — `~/.axecoder/secrets.json` 密钥存储。
  - **调研缺口：** 尚无 `docs/research/research-mcp-plugins-settings.md`；`research-axecoder-vs-claude-code.md` MCP 行已过时。
- **上游提案：** `docs/proposals/proposal-mcp-plugins-settings.md`（make-proposals 三方案版）
- **选定基础：** 提案 1 – 内置插件注册表 + `plugins.json` 状态层 + Settings Tab
- **用户调整摘要：** 无额外调整，按提案 1 原稿确认。

### 现状总结

| 能力 | 状态 |
|------|------|
| MCP 运行时（`CallMcpTool` 等） | ✅ 已实现 |
| Settings MCP 管理 UI | ❌ 无 |
| Context7 内置 / 开关 | ❌ 需手改 `mcp.json` |
| 密钥存储（`secrets.json`） | ✅ 已有，复用 |

配置合并顺序（现有）：`~/.cursor/mcp.json` → `~/.axecoder/mcp.json` → `~/.config/axecoder/mcp.json` → 项目 `.mcp.json`（后者覆盖前者）。

---

### 最终方案 – 内置插件注册表 + `mcp-plugins.json` + Settings MCP Tab

- **概述：** Main 进程维护 **内置 MCP 插件注册表**（V1 仅 Context7）；用户开关与状态写入 `~/.axecoder/mcp-plugins.json`；API Key 写入 `secrets.json`（键 `mcp:context7`）。`loadMcpConfig` 在读取各层 `mcp.json` 后 **虚拟合并** 已启用内置插件（远程 URL + 注入 header）。Settings 新增 **MCP** Tab：Context7 卡片含描述、开关、API Key、「测试连接」；toggle 后断开已有 MCP 连接池。Phase 2 可选加内置 Skill 引导 Agent 调用。

- **相对选定提案的变更：** 无（用户未提出调整）。以下 V1 默认决策固化原稿中的开放项：
  - Context7 仅用 **远程 HTTP**（`https://mcp.context7.com/mcp`），不用 npx 本地模式（避免 Electron 打包 PATH 问题）。
  - **OAuth** V1 不做。
  - 合并优先级：各层 `mcp.json` 先 merge → 再 append 插件层；若某层 `mcp.json` 已含同名 `context7`，**以 mcp.json 为准**，UI 显示「已由 mcp.json 配置」并禁用插件开关覆盖。
  - Tab 内 **不** 暴露「编辑 mcp.json」编辑器（留 V2 / Permissions 风格 JSON 编辑）。

- **关键变更：**

  | 模块 | 变更 |
  |------|------|
  | `electron/main/mcp-plugins-registry.ts` | **新增** — `McpPluginDefinition` 注册表；V1 仅 Context7 |
  | `electron/main/mcp-plugins-store.ts` | **新增** — 读写 `~/.axecoder/mcp-plugins.json` |
  | `electron/main/mcp-plugins-ipc.ts` | **新增** — `mcpPlugins:list` / `setEnabled` / `setApiKey` / `test` |
  | `electron/main/agent/agent-mcp.ts` | **修改** — `materializeEnabledPlugins()` 合并插件层；从 secrets 注入 `CONTEXT7_API_KEY` |
  | `electron/main/agent/agent-mcp-runtime.ts` | **修改** — toggle 后 `disconnectMcpServer('context7')`（由 IPC 调用） |
  | `electron/main/secrets-store.ts` | **修改** — 支持 `mcp:context7` 读写（或复用现有泛型 API） |
  | `src/components/workbench/McpPluginsTab.vue` | **新增** — Context7 卡片 UI |
  | `src/components/workbench/SettingsPanel.vue` | **修改** — 侧栏增加 MCP Tab |
  | `electron/preload/index.ts` + `src/types/axecoder.d.ts` | **修改** — IPC 类型与暴露 |
  | `shared/i18n/locales/{en,zh-CN}.ts` | **修改** — Tab 与文案 |
  | `tests/unittest/UT-mcp-plugins/` | **新增** — store 与 merge 单测 |
  | `resources/builtin-skills/context7-mcp/SKILL.md` | **可选 Phase 2** — Agent 调用引导 |

- **Context7 注册定义：**

  ```ts
  {
    id: 'context7',
    serverName: 'context7',
    url: 'https://mcp.context7.com/mcp',
    headerKey: 'CONTEXT7_API_KEY',
    secretKey: 'mcp:context7',
  }
  ```

- **数据流：**

  ```mermaid
  flowchart LR
    UI[McpPluginsTab] --> IPC[mcpPlugins IPC]
    IPC --> Store[mcp-plugins.json]
    IPC --> Secrets[secrets.json]
    Agent[loadMcpConfig] --> Merge[materializeEnabledPlugins]
    Merge --> Store
    Merge --> Secrets
    Merge --> Runtime[agent-mcp-runtime]
    Runtime --> C7[context7 HTTP MCP]
  ```

- **`~/.axecoder` 约定：**

  ```
  ~/.axecoder/
    mcp-plugins.json    # { "context7": { "enabled": true } }，不含密钥
    secrets.json        # 新增键 "mcp:context7"
    mcp.json            # 可选；用户/高级自定义，与插件层共存
  ```

- **权衡：**
  - **收益：** UI 与运行时解耦；不污染手写 `mcp.json`；与 Models Tab 交互一致；易扩展第二内置插件。
  - **风险：** 合并逻辑与重名冲突需单测；toggle 后需刷新 MCP 连接池；无 Key 时启用应提示而非静默失败。

- **验证：**
  - 单元：`mcp-plugins-store` CRUD；`loadMcpConfig` 合并（开/关/缺 Key/重名）；header 注入。
  - 集成：`mcpPlugins:test` mock HTTP；启用后 `/mcp` 列出 `resolve-library-id`、`query-docs`。
  - 手工：Settings 开 Context7 → 填 Key → 测试连接 → Agent 查库文档 → toggle 关后 Agent 不再列出 context7。

- **待解决问题：**
  - 实施前是否补 `docs/research/research-mcp-plugins-settings.md`（OAuth V2、Marketplace 路线）。
  - Phase 2：内置 Skill、Browse 市场占位、自定义 MCP 表单（见未采纳提案 3）。
  - 更新 `research-axecoder-vs-claude-code.md` MCP 行为描述。

### 未采纳方案说明

- **未选：提案 2 – UI 直接读写 `mcp.json`**
  - **原因：** 扩展多插件与手写 JSON 冲突风险高；与「Plugins」抽象不符；后续重构成本更大。

- **未选：提案 3 – 插件框架 + Marketplace 占位**
  - **原因：** V1 范围过大；Browse / 自定义 MCP 留 Phase 3，先交付 Context7 开关与连接验证。

---

**下一步：** 使用 `/make-plan` 产出 `docs/plans/plan-mcp-plugins-settings.md`，再实施。

---
