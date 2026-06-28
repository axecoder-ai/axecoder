# 选型记录 — multi-session-concurrency

## 2a 选型摘要

### 一句话需求回顾

多个 Agent Session 应能真正后台并发运行：切换 Tab 不阻塞、进度/SSE 不串线；用户能感知后台状态并在 Tab 上操作（含 Stop）。

### 方案对比表

| 维度 | 提案 1 前端隔离补丁 | 提案 2 RunOrchestrator + 早返回 sessionId |
|------|---------------------|----------------------------------------|
| 核心思路 | 渲染进程按 chatId 隔离 SSE/进度绑定，接上 Tab 圆点 | IPC 异步化 + 统一编排层 + 可选后台任务 UI |
| 主要改动范围 | ChatPane、useChatSessionRuns | 上述 + agent-ipc、send 全链路 |
| 优点 | 小改、快交付、复用主进程并行 | 根治猜绑、可观测性最强 |
| 缺点/风险 | 激活 Tab 外无实时进度条 | 工作量大、回归面广 |
| 工作量 | 小 | 中～大 |
| 适合场景 | 先补齐真并发底线 | 产品要完整多任务工作台 |

### 关键差异

- 提案 1 不改 `agent:send` 同步 IPC；提案 2 必须改主进程/前端异步契约
- 提案 1 后台 Session 仅 Tab 圆点 +（扩展）Stop；提案 2 可做全局后台任务列表
- 提案 1 风险低，与刚修复的 Session 切换兼容
- 提案 2 需回归 slash、plan、workshop 等所有 Agent 入口

### 推荐方案

**推荐：提案 1 – 前端隔离补丁**

理由：主进程已并行，缺口在前端单例 SSE 与 progress 猜绑；提案 1 用最小改动即可达到「多路不互抢 + 可感知 + 可 Stop」。

### 选型提示

下一步通过选择题确认；完整细节见 `docs/proposals/proposal-multi-session-concurrency.md`。

---

## 2b 用户最终选择

- **选定提案：** 提案 1 – 前端隔离补丁（Per-Session 资源 + Tab 指示）
- **调整说明：** 额外要求 Tab 栏可对**后台 Session** 一键 Stop（不仅当前激活 Tab）
