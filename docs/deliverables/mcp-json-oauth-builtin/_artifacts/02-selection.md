# 选型记录 — mcp-json-oauth-builtin

## 2a 选型摘要

**一句话需求：** 让 `mcp.json` 中的内置 OAuth 插件（V1 仅 context7）与 Settings / Agent OAuth 管线打通；**不做**非内置 server 的通用 OAuth。

| 维度 | 提案 1 按 serverName 自动富化 | 提案 2 显式 oauthPlugin 字段 |
|------|------------------------------|------------------------------|
| 核心思路 | 写 `context7` 即自动 OAuth 富化 | 可选 `oauthPlugin` 显式声明 + 同名回退 |
| 主要改动范围 | `agent-mcp.ts` enrich、IPC 放行 Connect | 提案 1 + parse 新字段 + 文档 |
| 优点 | 零学习成本；与 Cursor 习惯一致；改动最小 | 意图明确；多插件时更少歧义 |
| 缺点 / 风险 | 同名 server 被「保留名」占用 | 用户需知 schema；略多实现 |
| 工作量 | 小 | 小～中 |
| 适合场景 | 快速闭合、仅 context7、配置极简 | 计划扩展多内置 OAuth 插件 |

**关键差异：**
- 选 A：mcp.json 只写 `"context7": {}` 即可，无需新字段。
- 选 B：可写 `"oauthPlugin": "context7"` 显式绑定。
- 两者均不实现任意 url 的 OAuth discovery。
- Settings：`setEnabled` 仍对 mcp.json 禁用；两者都放开 Connect。
- mcp.json 已有 headers 时，优先 API Key，跳过 OAuth 富化。

**推荐：** 提案 1 – 按 serverName 自动富化

## 2b 用户确认

- **选定提案：** 提案 1 – 按 serverName 自动富化（零配置）
- **调整说明：** 无额外调整
