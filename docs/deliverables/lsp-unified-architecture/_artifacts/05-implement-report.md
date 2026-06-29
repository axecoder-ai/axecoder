# 功能实现报告

## 功能说明

将 LSP 运行时迁入 **Extension Host 子进程**，主进程通过 `ExtensionHostBridge` + 统一 `LspService` 门面服务 Monaco 编辑器与 Agent 工具（LSP / ReadLints / FixLints）。语言 server 优先由已安装 VS Code/Cursor 扩展自动发现（`lsp-extension-discovery.ts`），`lsp.json` 作为覆盖层保留。Host 通过 `notify` 通道转发 `publishDiagnostics` 至渲染进程。

## 修改文件列表

| 文件 | 说明 |
|------|------|
| `electron/main/extension-host/protocol.ts` | JSON 行 RPC 协议 |
| `electron/main/extension-host/lsp-runner.ts` | Host 内 LSP 运行时 |
| `electron/main/extension-host-process.ts` | 子进程入口 |
| `electron/main/extension-host-bridge.ts` | 主进程桥接 |
| `electron/main/lsp/lsp-service.ts` | 统一 LspService 门面 |
| `electron/main/lsp/lsp-extension-discovery.ts` | 扩展 manifest 扫描 |
| `electron/main/lsp/lsp-manager.ts` | 薄 re-export |
| `electron/main/lsp/lsp-config.ts` | 合并扩展发现 |
| `electron/main/lsp/lsp-editor-ipc.ts` | 诊断回调 + workspaceSymbol |
| `electron/main/agent/agent-lsp.ts` | 异步 isLspFileOpen |
| `electron/main/agent/agent-lsp-prompt.ts` | 文案更新 |
| `electron/main/config-store.ts` | `extensionHostLspEnabled` |
| `electron/main/models-types.ts` | 类型 |
| `electron/main/index.ts` | 退出时关闭 Host |
| `vite.config.ts` | 构建 extension-host-process |
| `tests/unittest/UT-extension-host/` | 协议单测 |
| `tests/unittest/UT-lsp-service/` | 门面/配置单测 |

## 单测覆盖

- Extension Host 协议编解码
- loadLspConfig 用户配置覆盖
- 回归 UT-agent-lsp、UT-read-lints-tool、UT-fix-lints-tool

## 注意事项

- `extensionHostLspEnabled=false` 时回退主进程 LSP
- Host 初始化失败（无 server）自动回退主进程
- 完整 `vscode-languageclient` shim、Companion 委托 VS Code 内置 LSP 为后续阶段
