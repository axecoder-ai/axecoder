# 方案选型记录

## 一句话需求回顾

优化 LSP 架构：将 LSP 从 Electron 主进程迁入扩展宿主、对齐 VS Code「装扩展即得语言支持」、合并编辑器与 Agent 的双入口为统一 RPC 桥。

## 方案对比表

| 维度 | 提案 1 Extension Host LSP 中心化 | 提案 2 主进程统一 + Manifest 发现 | 提案 3 仅统一入口 Phase 0 |
|------|----------------------------------|-----------------------------------|---------------------------|
| 核心思路 | Extension Host 子进程 + vscode-languageclient；LspBridge 统一 Monaco 与 Agent | 主进程 LspService 门面 + 扫描扩展 package.json 自动注册 server | 仅抽 LspService，配置方式不变 |
| 主要改动范围 | extension-host/、lsp-bridge、改造 lsp-editor-ipc 与 agent-lsp 系列 | lsp-service.ts、lsp-extension-discovery.ts、调用方改造 | lsp-service.ts、import 替换 |
| 优点 | VS Code 生态对齐；单入口；LSP 崩溃隔离 | 改动可控；快速消除双入口；低风险 | 1–2 天可完成 |
| 缺点 / 风险 | 工作量大；API shim 缺口；启动时延 | 未迁 Extension Host；发现规则需维护 | 不解决生态与主进程问题 |
| 工作量（粗估） | 大 | 中 | 小 |
| 适合场景 | 长期 VS Code 兼容、第三方扩展 | 渐进优化、先统一再演进 | 应急去重 |

## 关键差异说明

- 选提案 1：LSP 在 Extension Host，语言 server 由已安装 VS Code 扩展驱动，`lsp.json` 降为可选覆盖。
- 选提案 2：LSP 仍在主进程，靠 manifest 扫描半自动发现，无法完整复用扩展内嵌 server。
- 选提案 3：只合并 API，三处痛点基本不解决。
- 提案 1 与 `proposal-workbench-contributions` 提案 2 可共享 Extension Host 基础设施。
- Agent Worker 已委托主进程 LSP 刷新，任何方案须保持该路径。

## 推荐方案

**推荐：提案 1 – Extension Host LSP 中心化**

理由：与用户提出的三点痛点一一对应；与 workbench Extension Host 方向一致；编辑器与 Agent 共享 Host 侧 Language Client，诊断与文档状态天然一致。

## 用户最终选择

- **选定：提案 1 – Extension Host LSP 中心化（VS Code 语言生态对齐）**
- **调整说明：** 无额外调整，按方案原文落地
