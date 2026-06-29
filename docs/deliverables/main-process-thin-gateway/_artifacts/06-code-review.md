# 代码审查 — main-process-thin-gateway

## 结论

**通过**

## 功能

- [x] Agent IPC 经 bridge 转发，默认启用 Worker
- [x] CodeGraph IPC 经 Indexer Worker
- [x] Workshop IPC 经 Workshop Worker
- [x] host RPC：workshop 进度 + agent 进度/LSP/trace
- [x] 配置回退路径（`with*Runtime` local 分支）
- [x] 退出 shutdown 全部 bridge

## 质量

- [x] 复用 `agent-worker/protocol` JSON 行 RPC，与既有模式一致
- [x] `workshop-send.ts` 抽取避免 IPC/runner 重复
- [ ] 非阻塞：Worker 崩溃自动重启（遗留 Phase 2）

## 安全

- [x] 子进程 `fork` + `ELECTRON_RUN_AS_NODE`，无新增网络暴露
- [x] host-handlers 白名单方法

## 阻塞项

无

## 非阻塞待办

1. MCP IPC 迁入 Agent Worker
2. Workshop 与 Agent Worker 跨进程 session 统一
3. `packages/` 物理搬迁
