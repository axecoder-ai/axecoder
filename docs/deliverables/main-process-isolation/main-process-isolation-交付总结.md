---
任务名: main-process-isolation
完成日期: 2026-06-29
选定方案: 提案 2 — 独立 Agent Worker 进程
审查结论: 通过
单测全绿: 是（783/783）
---

# main-process-isolation 交付总结

## 1. 概述

**需求：** 优化 Agent 57 个工具等业务堆在主进程、隔离性弱的问题，向 VS Code 式「主进程薄桥接 + 子进程执行业务」靠拢。

**本轮目标：** 将 Agent 运行时迁入独立 **Agent Worker** 子进程，主进程 IPC 代理，渲染进程 API 不变。

**选型：** 推荐为提案 1（分层 Tool Worker），用户最终选定 **提案 2**（整包 Agent Runtime 外移），无额外调整。

**交付物目录：** `docs/deliverables/main-process-isolation/_artifacts/`

---

## 2. 方案

**状态：** 已确认

**核心决策：**
- `fork` + `ELECTRON_RUN_AS_NODE` 启动 `agent-worker-process.js`
- JSON 行 RPC（req/res/host/hostRes）
- 代码仍位于 `electron/main/agent/`，Worker 为第二构建入口
- `agentWorkerEnabled` 默认 `true`，可回退主进程内执行

**影响范围：** `agent-ipc`、agent loop 委托、vite 双入口、配置项。

---

## 3. 方案选型过程

| 维度 | 提案 1 Tool Worker | 提案 2 Agent Worker |
|------|-------------------|---------------------|
| 思路 | 仅重型工具子进程化 | 整包 Agent 外移 |
| 工作量 | 中 | 大 |
| 隔离 | 部分 | 强 |

**用户选择：** 提案 2。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

三阶段：协议与桥接 → 监督恢复 → 目录整理（可选）。本次完成 Phase 1。

全文：`_artifacts/plan-main-process-isolation.md`

---

## 5. 实现说明

- 新增 `AgentWorkerBridge`、`agent-worker/runner.ts`、protocol、host-handlers
- `withAgentRuntime` 包装全部 Agent 运行时 IPC
- Worker 内 `emitAgentProgress` / LSP / Trace 反向 RPC 至主进程

全文：`_artifacts/05-implement-report.md`

---

## 6. 单元测试执行情况

- 命令：`npm test`
- 结果：**163 文件 / 783 用例全通过**
- 新增：`UT-agent-worker/agent-worker.test.ts`

全文：`_artifacts/05-unittest.md`

---

## 7. 测试报告

- 自动化：vitest 全绿
- 手工：待验证 dev 构建后 Chat 发消息 + 工具进度 + Write 审批（需 `dist-electron/main/agent-worker-process.js` 存在）

---

## 8. 代码审查

**结论：通过。** Workshop 回合与 Worker 崩溃自动重启为非阻塞待办。

全文：`_artifacts/06-code-review.md`

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent-worker/*` | 新增 | 协议、runner、host-handlers |
| `electron/main/agent-worker-process.ts` | 新增 | Worker 入口 |
| `electron/main/agent-worker-bridge.ts` | 新增 | 主进程 bridge |
| `electron/main/agent-runtime-proxy.ts` | 新增 | IPC 代理辅助 |
| `electron/main/agent/main-process-delegate.ts` | 新增 | 主进程能力委托 |
| `electron/main/agent-ipc.ts` | 修改 | 运行时走 Worker |
| `electron/main/agent/agent-*.ts` | 修改 | 进度/LSP/Trace 委托 |
| `electron/main/config-store.ts` | 修改 | agentWorkerEnabled |
| `vite.config.ts` | 修改 | 双入口构建 |
| `tests/unittest/UT-agent-worker/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

1. Workshop `runWorkshopRoleAgentTurn` 纳入 Worker RPC
2. Worker 崩溃自动重启与健康检查
3. 可选：物理迁至 `packages/agent-runtime/`
4. 完整 Extension Host / 插件市场仍为独立长期项

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型记录 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-main-process-isolation.md` |
| 实施计划 | `_artifacts/plan-main-process-isolation.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测记录 | `_artifacts/05-unittest.md` |
| 代码审查 | `_artifacts/06-code-review.md` |
