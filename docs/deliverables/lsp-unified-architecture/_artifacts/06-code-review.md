# 代码审查报告

**审查范围：** LSP 统一架构（Extension Host + LspService + 扩展发现）  
**对照：** `proposal-lsp-unified-architecture.md`、`plan-lsp-unified-architecture.md`

## 功能

- [x] Extension Host 子进程承载 LSP，`extensionHostLspEnabled` 可关闭回退
- [x] `LspService` 统一编辑器 IPC 与 Agent 工具入口
- [x] 扩展 manifest 扫描 + `lsp.json` 覆盖
- [x] 诊断经 notify 转发至 Monaco
- [x] Host 失败回退主进程，避免无 server 时硬失败

## 代码质量

- [x] 复用 Agent Worker 的 fork + JSON-RPC 模式，结构一致
- [x] `lsp-manager.ts` 保持向后兼容 re-export
- [ ] `HostLspProxy.isFileOpen` 同步返回 false（已通过 `isLspFileOpen` 异步补救）— 非阻塞
- [ ] 扩展发现 allowlist 需持续维护 — 已知限制

## 安全

- [x] 无新增外部网络入口；扩展目录只读扫描
- [x] language server 仍由用户本机扩展/二进制启动

## 阻塞项

无。

## 非阻塞待办

1. Companion 模式委托 `vscode.languages.*`
2. 设置页展示已发现 language server
3. 集成 `vscode-languageclient` 完整 shim
4. Host 模式 `getAllServers` 空 Map 时部分诊断绑定依赖 notify only（已覆盖）

## 审查结论

**通过**
