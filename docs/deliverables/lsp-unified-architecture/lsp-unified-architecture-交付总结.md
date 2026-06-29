# LSP 统一架构 — 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | lsp-unified-architecture |
| 完成日期 | 2026-06-29 |
| 选定方案 | 提案 1 – Extension Host LSP 中心化 |
| 审查结论 | 通过 |
| 单测 | 全绿（20/20） |

---

## 1. 概述

**需求：** LSP 不应跑在主进程；语言支持应对齐 VS Code「装扩展即得」；编辑器与 Agent 不应维护两套 LSP 入口。

**本轮目标：** Extension Host 子进程承载 LSP；`LspService` 统一 Monaco 与 Agent；扩展 manifest 自动发现 language server。

**选型：** 推荐并选定提案 1；无额外调整。

**交付物目录：** `docs/deliverables/lsp-unified-architecture/_artifacts/`

---

## 2. 方案

LSP 迁入 Extension Host（`fork` + JSON-RPC），主进程 `ExtensionHostBridge` 网关 + `LspService` 门面。扫描 `~/.vscode/extensions`、`~/.cursor/extensions` 注册 server；`lsp.json` 为可选覆盖。`extensionHostLspEnabled=false` 或 Host 失败时回退主进程 LSP。

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 | 提案 3 |
|------|--------|--------|--------|
| 核心 | Extension Host + 扩展生态 | 主进程 + manifest 发现 | 仅统一 API |
| 工作量 | 大 | 中 | 小 |

**用户选择：** 提案 1；调整：无。

详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

阶段一（本轮）：Extension Host、LspService、扩展发现、诊断转发、单测。  
阶段二：vscode-languageclient 完整 shim、Companion 委托、设置页 UI。

详见 `_artifacts/plan-lsp-unified-architecture.md`。

---

## 5. 实现说明

- 新增 `extension-host/`、`extension-host-bridge.ts`、`lsp-service.ts`、`lsp-extension-discovery.ts`
- `lsp-manager.ts` 改为 re-export；`lsp-editor-ipc` / `agent-lsp` 经统一门面
- 配置项 `extensionHostLspEnabled`（默认 true）

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

```bash
npm test -- tests/unittest/UT-extension-host tests/unittest/UT-lsp-service tests/unittest/UT-agent-lsp tests/unittest/UT-read-lints-tool tests/unittest/UT-fix-lints-tool
```

**结果：** 5 文件、20 用例，全部通过。

详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 单测覆盖协议、配置合并、Agent LSP、ReadLints、FixLints
- 集成/E2E：待补充（需本机安装 language server 扩展后手工验证 hover/诊断）

---

## 8. 代码审查

**结论：通过。** 无阻塞项；待办：Companion 双轨、allowlist 维护、设置页。

详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/extension-host/*` | 新增 | Host 协议与 LSP runner |
| `electron/main/extension-host-process.ts` | 新增 | 子进程入口 |
| `electron/main/extension-host-bridge.ts` | 新增 | 主进程 RPC 桥 |
| `electron/main/lsp/lsp-service.ts` | 新增 | 统一门面 |
| `electron/main/lsp/lsp-extension-discovery.ts` | 新增 | 扩展扫描 |
| `electron/main/lsp/lsp-manager.ts` | 修改 | re-export |
| `electron/main/lsp/lsp-config.ts` | 修改 | 合并发现 |
| `electron/main/lsp/lsp-editor-ipc.ts` | 修改 | 诊断/workspaceSymbol |
| `electron/main/agent/agent-lsp.ts` | 修改 | isLspFileOpen |
| `electron/main/config-store.ts` | 修改 | 新配置项 |
| `vite.config.ts` | 修改 | 构建入口 |
| `tests/unittest/UT-extension-host/` | 新增 | 单测 |
| `tests/unittest/UT-lsp-service/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

1. Companion 模式直接委托 VS Code 内置 LSP
2. 设置页「已发现语言服务器」列表
3. 扩展发现 allowlist 扩展至更多语言
4. 集成测试：安装 rust-analyzer 扩展后零配置 hover

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型记录 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-lsp-unified-architecture.md` |
| 实施计划 | `_artifacts/plan-lsp-unified-architecture.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测记录 | `_artifacts/05-unittest.md` |
| 代码审查 | `_artifacts/06-code-review.md` |
