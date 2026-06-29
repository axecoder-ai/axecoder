# 代码审查 — main-process-isolation

**审查范围：** Agent Worker 子进程架构相关变更  
**对照：** `docs/proposals/proposal-main-process-isolation.md`、`docs/plans/plan-main-process-isolation.md`

## 功能

- [x] `agent:send` / stop / 审批类 IPC 经 `withAgentRuntime` 转发至 Worker
- [x] Progress、LSP、Trace 反向 RPC 至主进程
- [x] `agentWorkerEnabled=false` 回退路径
- [ ] Workshop `runWorkshopRoleAgentTurn` 仍在主进程（**非阻塞遗留**）

## 代码质量

- [x] 协议与 bridge 分离清晰，复用 browser-runner JSON 行模式
- [x] 单测覆盖协议与代理开关
- [x] 未大规模搬迁 77 个 agent 文件，降低风险

## 安全

- [x] Worker 与主进程权限相当（与改造前 Agent 一致），未新增 secrets 暴露
- [x] RPC 仅本地 stdio，无网络监听

## 阻塞项

无。

## 非阻塞待办

1. Worker 崩溃自动重启与 session 恢复策略
2. Workshop Agent 回合纳入 Worker
3. 集成测试：fork 真实 worker 执行 `ping` / 冒烟 `send`

## 审查结论

**通过** — 可合并；Workshop 与崩溃恢复作为后续迭代。
