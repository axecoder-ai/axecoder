# 已确认解决方案提案：取消 Shell

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 实现 Agent「取消 Shell」：终止 `run_in_background` 启动且仍在运行的后台 Bash。
- **调研来源：** `docs/deliverables/cancel-shell/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-cancel-shell.md`（双方案草稿）
- **选定基础：** 提案 1 – 扩展 TaskStop 统一取消后台任务
- **用户调整摘要：** 无额外调整，按方案原文落地。

---

### 最终方案 – 扩展 TaskStop 统一取消后台任务

- **概述：** 在 `agent-bash-tasks.ts` 为每个后台 shell 保存 `ChildProcess` 引用；新增 `stopShellTask(taskId)`（SIGTERM，close 后标记 `stopped`）。`TaskStop` 先尝试 `stopBackgroundRun`，再 `stopShellTask`。`stopAgentTurn` 终止当前 session 下所有 running shell。更新工具描述。
- **相对选定提案的变更：** 无（用户无调整）。
- **关键变更：**
  - `electron/main/agent/agent-bash-tasks.ts`
  - `electron/main/agent/agent-ext-executor.ts`
  - `electron/main/agent/agent-loop.ts`
  - `electron/main/agent/agent-tool-prompts-ext.ts`
  - `electron/main/agent/tool-executor.ts`（传递 sessionId）
  - `tests/unittest/UT-cancel-shell/`
- **权衡：** TaskStop 语义扩展为「子代理或后台 shell」；前台同步 Bash 在用户 Stop 时仍可能跑到 timeout（已知限制）。
- **验证：** Vitest：长 sleep 后台任务 + TaskStop；已结束任务幂等；`npm test` 全绿。
- **待解决问题：** 前台 Bash abort、Chat UI 取消按钮为二期。

### 未采纳方案说明

- **未选：** 提案 2 – 新增 KillShell 专用工具
- **原因：** 用户选型优先最小 API 面，与 TaskOutput 成对使用 TaskStop。
