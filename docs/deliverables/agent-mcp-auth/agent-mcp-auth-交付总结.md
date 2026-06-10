# agent-mcp-auth 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | agent-mcp-auth |
| 完成日期 | 2026-06-10 |
| 选定方案 | 提案 1 — 复用 Settings OAuth 管线 |
| 审查结论 | 通过 |
| 本功能单测 | 全绿（6/6） |

---

## 1. 概述

**需求：** Agent `McpAuth` 工具需触发真实 MCP OAuth，而非仅返回说明文案。

**目标：** 复用 `connectMcpPluginOAuth`，使对话内 `McpAuth` 与 Settings「连接」行为一致。

**选型：** 推荐并采用提案 1；用户「直接实现吧」确认无额外调整。

**交付物目录：** `docs/deliverables/agent-mcp-auth/_artifacts/`

---

## 2. 方案

`McpAuth` → `authenticateMcpServer` → 内置 OAuth 插件走 `connectMcpPluginOAuth`；headers/stdio 返回状态；成功后刷新 MCP 连接池。

详见 `_artifacts/proposal-agent-mcp-auth.md`。

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 思路 | 真实 OAuth | 仅提示文案 |
| 工作量 | 小 | 极小 |

用户选定提案 1。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

三阶段：认证模块 → Agent 接线 → 单测。详见 `_artifacts/plan-agent-mcp-auth.md`。

---

## 5. 实现说明

- 新建 `agent-mcp-auth.ts`
- `agent-ext-executor` 替换 stub
- 6 条单测覆盖 OAuth/stdio/headers/错误路径

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

```bash
npm test -- tests/unittest/UT-agent-mcp-auth/agent-mcp-auth.test.ts
```

**6/6 通过（全绿）**。全量 587/588，1 个既有无关失败。详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

| 场景 | 结果 |
|------|------|
| context7 OAuth 连接 | 单测通过 |
| 已有 token | 单测通过 |
| stdio / headers | 单测通过 |
| 手工 Agent 对话 | 待用户验证 |

---

## 8. 代码审查

**通过**，无阻塞项。详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-mcp-auth.ts` | 新增 | 认证逻辑 |
| `electron/main/mcp-plugins-registry.ts` | 修改 | serverName 查找 |
| `electron/main/agent/agent-ext-executor.ts` | 修改 | McpAuth 接线 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 修改 | 工具描述 |
| `tests/unittest/UT-agent-mcp-auth/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

- 任意 mcp.json 自定义 OAuth server 的通用授权（需插件元数据或 OAuth discovery）
- 更新 `research-agent-tools-matrix.md` McpAuth 列
- 修复既有 `bash-integration` 单测失败

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型 | `_artifacts/02-selection.md` |
| 提案 | `_artifacts/proposal-agent-mcp-auth.md` |
| 计划 | `_artifacts/plan-agent-mcp-auth.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 审查 | `_artifacts/06-code-review.md` |
