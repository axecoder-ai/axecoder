# LSP 统一架构 — 实施计划

## 当前背景

- LSP 运行在 `electron/main/lsp/*`，由主进程 `spawn` language server
- 配置依赖 `~/.axecoder/lsp.json` / `.axecoder/lsp.json`
- `lsp-editor-ipc.ts` 与 `agent-lsp.ts` 等共用 `lsp-manager` 但 IPC/handler 层重复
- `extensions/axecoder` 无 LSP 集成；Agent Worker 经 `delegateNotifyLspFileRefresh` 委托主进程

## 需求

### 功能需求

- Extension Host 子进程承载 LSP 运行时
- `LspService` 统一 Monaco 与 Agent 调用
- 扫描 `~/.vscode/extensions`、`~/.cursor/extensions` 自动注册 language server
- `lsp.json` 作为覆盖层保留
- Host 向主进程转发 `publishDiagnostics` 通知

### 非功能需求

- `extensionHostLspEnabled=false` 时回退主进程 LSP（兼容）
- Host 崩溃后主进程可重启；Agent Worker 路径不变

## 设计决策

### 1. 进程模型

复用 Agent Worker 模式：`fork` + `ELECTRON_RUN_AS_NODE` + JSON 行 RPC。Host 内直接复用现有 `lsp-server-manager`。

### 2. 扩展发现

Allowlist 映射扩展 ID → server 启动命令（rust-analyzer 捆绑二进制、TS/Python/Go 等 PATH 或扩展内路径）。

### 3. 统一门面

`lsp-service.ts` 对外 API 与 `LSPServerManager` 一致；`lsp-manager.ts` 改为薄 re-export。

## 实施计划

### 阶段一：Extension Host + LspService（本轮）

1. protocol + bridge + lsp-runner + process 入口
2. lsp-extension-discovery + lsp-config 合并
3. lsp-service 门面 + lsp-manager 改造
4. lsp-editor-ipc 诊断绑定改经 notify
5. config + vite 入口 + index 退出清理
6. 单测

### 阶段二（后续）

- `vscode-languageclient` 完整集成
- Companion 模式委托 `vscode.languages.*`
- 设置页「已发现语言服务器」UI

## 测试策略

- `UT-extension-host`：protocol 编解码、manifest 解析
- `UT-lsp-service`：门面路由、合并优先级
- 回归 `UT-agent-lsp`、`UT-read-lints-tool`

## 文件变更

| 文件 | 类型 |
|------|------|
| `electron/main/extension-host/*` | 新增 |
| `electron/main/extension-host-bridge.ts` | 新增 |
| `electron/main/extension-host-process.ts` | 新增 |
| `electron/main/lsp/lsp-service.ts` | 新增 |
| `electron/main/lsp/lsp-extension-discovery.ts` | 新增 |
| `electron/main/lsp/lsp-config.ts` | 修改 |
| `electron/main/lsp/lsp-manager.ts` | 修改 |
| `electron/main/lsp/lsp-editor-ipc.ts` | 修改 |
| `electron/main/config-store.ts` | 修改 |
| `electron/main/models-types.ts` | 修改 |
| `electron/main/index.ts` | 修改 |
| `vite.config.ts` | 修改 |
| `tests/unittest/UT-lsp-service/*` | 新增 |
| `tests/unittest/UT-extension-host/*` | 新增 |
