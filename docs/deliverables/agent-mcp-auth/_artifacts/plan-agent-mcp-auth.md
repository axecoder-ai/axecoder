# 实施计划 — agent-mcp-auth

> 依据：`docs/proposals/proposal-agent-mcp-auth.md`（已确认）

## 范围

| 在范围 | 不在范围 |
|--------|----------|
| `McpAuth` → `authenticateMcpServer` | 通用 mcp.json OAuth discovery |
| 内置 OAuth 插件（context7） | MCP Marketplace |
| 单测 UT-agent-mcp-auth | UI 改动 |

## 阶段

### 阶段一：认证模块（0.25d）

1. `getMcpPluginByServerName` in registry
2. `agent-mcp-auth.ts`：`runOAuthForPlugin` + `authenticateMcpServer`

### 阶段二：Agent 接线（0.25d）

1. `agent-ext-executor.ts` 替换 stub
2. 更新 `agent-tool-prompts-ext.ts` 描述

### 阶段三：单测与文档（0.25d）

1. `UT-agent-mcp-auth` 6 用例
2. rppit 交付物

## 验收标准

- [x] `McpAuth` 对 context7 触发 OAuth 或返回已连接
- [x] stdio / headers server 返回合理文案
- [x] 新单测全绿
