# 方案提案：Agent Bash 与 同类 Agent 对齐

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 将 同类 Agent 的 `Bash` 工具能力移植到 AxeCoder（本轮为契约 + 轻量后台，非完整运行时 1:1）。
- **调研来源：** `docs/deliverables/agent-bash-parity/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-agent-bash-parity.md`（双方案草稿）
- **选定基础：** 提案 2 – 契约对齐 + 轻量后台
- **用户调整摘要：** 首版仅保证 macOS/Linux；Windows 持久 shell 与完整 1:1 后续迭代。

---

### 最终方案 – 契约对齐 + 轻量后台

- **概述：** 保持每次 `spawn -lc` 前台执行；对外暴露 CC 参数 `command`、`timeout`（兼容 `timeout_ms`）、`description`、`run_in_background`；`run_in_background: true` 时在用户批准后启动后台 shell 任务，返回 `backgroundTaskId`，由既有 `TaskOutput` 读取输出；更新 `BASH_DESCRIPTION` 移除「无后台」表述并指引 TaskOutput；`ChatBashCard` 展示 description。
- **相对选定提案的变更：** 明确首版不覆盖 Windows 专项测试；不实现持久会话、15s 自动后台、沙箱。
- **关键变更：**
  - 新增 `electron/main/agent/agent-bash-tasks.ts`
  - 修改 `agent-bash.ts`、`agent-tool-prompts.ts`、`tool-executor.ts`、`agent-types.ts`、`agent-session-store.ts`
  - 修改 `agent-ext-executor.ts`（`TaskOutput` 合并 shell 任务）
  - 修改 `ChatBashCard.vue`、`src/types/axecoder.d.ts`
  - 新增 `tests/unittest/UT-agent-bash-parity/`
- **权衡：** 模型侧 API 与 CC 文档一致；行为上 cwd 不跨调用保留。
- **验证：** Vitest：参数别名、后台任务生命周期、危险 git、TaskOutput；`npm test` 全绿。
- **待解决问题：** 持久 shell、自动后台、bash classifier/sandbox 列为二期。

### 未采纳方案说明

- **未选：** 提案 1 – CC Bash 运行时全量对齐
- **原因：** 用户选型优先交付速度与可控风险。
