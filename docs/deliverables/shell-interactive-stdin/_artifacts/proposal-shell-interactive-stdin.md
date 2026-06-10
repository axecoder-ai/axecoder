# 方案提案：Shell 交互 stdin

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 实现 Agent「Shell 交互 stdin」，对齐矩阵 §2 缺口。
- **调研来源：** `docs/deliverables/shell-interactive-stdin/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-shell-interactive-stdin.md`（双方案草稿）
- **选定基础：** 提案 1 – 独立 ShellStdin 工具 + 可交互后台 Shell
- **用户调整摘要：** 提案 1 为主；**同时**为 Bash 增加可选 `stdin` 参数（一次性管道输入）；不做独立 UI 审计日志。

---

### 最终方案 – ShellStdin 工具 + Bash stdin 参数

- **概述：** 新增 `ShellStdin` 工具（`task_id` + `input` + 可选 `close_stdin`），向运行中的后台 Bash 任务写入 stdin；扩展 `agent-bash-tasks.ts` 后台 spawn 使用 stdin pipe 并保留进程句柄。现有 `Bash` 增加可选 `stdin` 字符串，前台/后台启动时注入并默认 close stdin。模型交互流：`Bash(run_in_background)` → `TaskOutput` 读 prompt → `ShellStdin` → 再 `TaskOutput`。
- **相对选定提案的变更：** 合并提案 2 的 Bash `stdin` 参数；不实现 UI 审计日志。
- **关键变更：**
  - `electron/main/agent/agent-bash-tasks.ts` — stdin pipe、进程句柄、`writeShellStdin`
  - `electron/main/agent/agent-bash.ts` — 前台 Bash 可选 stdin 注入
  - `electron/main/agent/agent-types.ts` — `ShellStdin` 工具名
  - `electron/main/agent/agent-tool-prompts-ext.ts` — ShellStdin schema/description
  - `electron/main/agent/agent-tool-prompts.ts` — Bash 增加 `stdin` 参数与文案
  - `electron/main/agent/agent-ext-executor.ts` — 执行 ShellStdin
  - `electron/main/agent/agent-permissions.ts` — ShellStdin 权限（与 TaskOutput 同级自动允许）
  - `electron/main/agent/tool-executor.ts` — Bash stdin 透传
  - `tests/unittest/UT-shell-interactive-stdin/`
- **权衡：** 后台任务内存保留 proc 直至结束；stdin 写入不经过 execpolicy（不执行新命令）。Bash `stdin` 大字符串受输出截断策略类似上限（64k）。
- **验证：** Vitest mock spawn；后台多轮 read/write；Bash stdin 一次性注入；`npm test` 全绿。
- **待解决问题：** Windows 交互 shell 专项测试；持久跨调用 shell 会话仍为二期。

### 未采纳方案说明

- **未选：** 仅提案 2（Bash 内嵌 stdin）
- **原因：** 无法覆盖多轮交互；用户要求以提案 1 为主并合并 stdin 参数。
