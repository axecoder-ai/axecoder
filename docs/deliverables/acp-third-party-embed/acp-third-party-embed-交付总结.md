---
任务名: acp-third-party-embed
完成日期: 2026-06-30
选定方案: 提案 1 – 独立 ACP stdio 适配器（axecoder acp）
审查结论: 通过
本需求单测: 5/5 全绿
---

# ACP 第三方嵌入 — 交付总结

## 1. 概述

**需求：** 实现 ACP（Agent Client Protocol）第三方嵌入，使 Zed、JetBrains、Neovim 等外部编辑器可通过 stdio JSON-RPC 驱动 AxeCoder Agent。

**本轮目标：** 交付无头 CLI `axecoder-acp`，对齐 Cursor `agent acp` 生态位。

**选型：** 推荐并选定提案 1（独立 stdio 适配器）；无额外调整。

**交付物目录：** `docs/deliverables/acp-third-party-embed/_artifacts/`

---

## 2. 方案

**状态：** 已确认

**核心：** `@agentclientprotocol/sdk` + fork `agent-worker`；ACP `session/prompt` → Worker `send`；progress → `session/update`；pending → `session/request_permission` → `confirm*` / `reject*`。

**影响范围：** `electron/main/acp/*`、`acp-cli.ts`、`scripts/axecoder-acp.mjs`、`package.json` bin。

---

## 3. 方案选型过程

| 维度 | 提案 1 stdio 适配器 | 提案 2 Electron GUI |
|------|---------------------|---------------------|
| 核心 | `axecoder acp` 无头 CLI | 桌面内嵌 + UI 审批 |
| 工作量 | 中 | 大 |
| 选定 | ✅ | — |

用户选择：提案 1，无额外调整。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

1. 依赖与 CLI 入口
2. bridge / mapper / host-handlers
3. `create-acp-app.ts` pending 循环
4. `UT-acp-server` 单测

全文：`_artifacts/plan-acp-third-party-embed.md`

---

## 5. 实现说明

- **CLI：** `npx axecoder-acp` 或 Zed `"command": "axecoder-acp"`
- **协议：** initialize、session/new、session/prompt、session/cancel
- **模型：** `~/.axecoder/models.json` 的 `activeModelId`
- **构建：** `dist-electron/main/acp-cli.js`

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

| 范围 | 结果 |
|------|------|
| `UT-acp-server` | 5/5 通过 |
| 全量 `npm test` | 844/845（1 个既有 `RevertTurn` 文案长度失败，非本次引入） |

详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 单测：mapper、in-process ACP 握手 ✅
- 构建：`vite build` 产出 `acp-cli.js` ✅
- 手工 Zed 冒烟：待用户在本地配置 `agent_servers` 验证

---

## 8. 代码审查

**结论：通过**，无阻塞项。

待办：V2 `cursor/*` 扩展、ACP Registry、AskQuestion 结构化问答。

详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/acp/*.ts` | 新增 | ACP 核心模块 |
| `electron/main/acp-cli.ts` | 新增 | stdio 入口 |
| `scripts/axecoder-acp.mjs` | 新增 | npm bin |
| `vite.config.ts` | 修改 | acp-cli entry |
| `package.json` | 修改 | bin + SDK 依赖 |
| `tests/unittest/UT-acp-server/*` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

1. ACP Registry 上架与安装文档
2. `cursor/ask_question` / `cursor/create_plan` 扩展方法
3. 打包 DMG 内嵌 `axecoder-acp` 绝对路径说明
4. 修复既有 `UT-agent-tool-level-prompts` RevertTurn 文案长度

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型记录 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-acp-third-party-embed.md` |
| 实施计划 | `_artifacts/plan-acp-third-party-embed.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测报告 | `_artifacts/05-unittest.md` |
| 代码审查 | `_artifacts/06-code-review.md` |
