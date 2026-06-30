# mcp-json-oauth-builtin 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | mcp-json-oauth-builtin |
| 完成日期 | 2026-06-30 |
| 选定方案 | 提案 1 — 按 serverName 自动富化 |
| 审查结论 | 通过 |
| 本功能单测 | 全绿（19/19） |

---

## 1. 概述

**需求：** `mcp.json` 中配置内置 OAuth 插件（V1 仅 context7）时，应自动走 OAuth 管线；**不**做任意自定义 server 的 OAuth discovery。

**目标：** 零配置富化 + Settings Connect 放行 + 运行时 `oauthPluginId` 传输。

**选型：** 推荐并采用提案 1；用户无额外调整。

**交付物目录：** `docs/deliverables/mcp-json-oauth-builtin/_artifacts/`

---

## 2. 方案

`loadMcpJsonLayers` 后调用 `enrichBuiltinOAuthServers()`：serverName 匹配内置 OAuth 插件时注入元数据。headers 优先 API Key；有 token 走 OAuth；无凭证仍注入 oauthPluginId 供 Connect/McpAuth 触发授权。

详见 `_artifacts/proposal-mcp-json-oauth-builtin.md`。

---

## 3. 方案选型过程

| 维度 | 提案 1 自动富化 | 提案 2 显式字段 |
|------|----------------|----------------|
| 配置 | 写 `context7` 即可 | 需 `oauthPlugin` 字段 |
| 工作量 | 小 | 小～中 |

用户选定提案 1。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

五阶段：单测 → enrich 实现 → IPC → UI/i18n → 回归。详见 `_artifacts/plan-mcp-json-oauth-builtin.md`。

---

## 5. 实现说明

- `enrichBuiltinOAuthServers` 于 `agent-mcp.ts`
- IPC Connect/Disconnect/Test 适配 mcp.json 托管
- McpPluginsTab 对 OAuth 插件显示 Connect 区

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

```bash
npm test -- tests/unittest/UT-mcp-plugins/mcp-json-oauth-enrich.test.ts ...
```

**19/19 通过（全绿）**。全量 833/834，1 个既有无关失败。详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

| 场景 | 结果 |
|------|------|
| mcp.json 空 context7 富化 | 单测通过 |
| OAuth token / API Key / headers 优先 | 单测通过 |
| loadMcpConfig 集成 | 单测通过 |
| Settings Connect（mcp.json） | 代码已放行，待手工验证 |
| Agent McpAuth | 既有逻辑兼容 |

---

## 8. 代码审查

**通过**，无阻塞项。详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-mcp.ts` | 修改 | enrichBuiltinOAuthServers |
| `electron/main/mcp-plugins-ipc.ts` | 修改 | mcp.json OAuth IPC |
| `src/components/workbench/McpPluginsTab.vue` | 修改 | OAuth 操作区 |
| `shared/i18n/locales/en.ts` | 修改 | 文案 |
| `shared/i18n/locales/zh-CN.ts` | 修改 | 文案 |
| `tests/unittest/UT-mcp-plugins/mcp-json-oauth-enrich.test.ts` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

- 任意 mcp.json 自定义 OAuth server（非内置）— 需 OAuth discovery，不在本轮范围
- 更新 `research-agent-tools-matrix.md` §17 条目
- 多内置 OAuth 插件时可评估显式 `oauthPlugin` 字段

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型 | `_artifacts/02-selection.md` |
| 提案 | `_artifacts/proposal-mcp-json-oauth-builtin.md` |
| 计划 | `_artifacts/plan-mcp-json-oauth-builtin.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 审查 | `_artifacts/06-code-review.md` |
