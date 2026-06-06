# 已确认解决方案提案：Agent OS 级沙箱

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 借鉴 `DeepSeek-TUI`，为 AxeCoder Agent Bash 接入 macOS Seatbelt OS 沙箱与 execpolicy 策略引擎。
- **调研来源：** `docs/deliverables/agent-os-sandbox/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-agent-os-sandbox.md`（双方案草稿）
- **选定基础：** 提案 1 – TypeScript 移植 Seatbelt + execpolicy
- **用户调整摘要：** 尽量完整移植 arity-aware 前缀匹配与 cargo/npm cache SBPL 例外（full_parity）

---

### 最终方案 – TypeScript 移植 Seatbelt + execpolicy

- **概述：** 在 `electron/main/agent/` 新增 execpolicy 与 Seatbelt 模块，移植 DeepSeek-TUI 的 TOML 规则评估、arity-aware 前缀匹配、heredoc 规范化、SBPL 策略生成（含 cargo/npm cache 例外）。macOS 下 `runAgentBash` / `startBackgroundBash` 经 `sandbox-exec` 包装；执行前 execpolicy 评估：Deny 直接拒绝，AskUser 走既有 `bash_pending`（用户批准后仍受 Seatbelt 约束）。配置：`~/.axecoder/execpolicy.toml`；默认 `sandboxMode: workspace-write`、无网络。
- **相对选定提案的变更：** 用户要求 full_parity — arity 字典与 `prefix_allow_matches`、heredoc strip、`pattern_matches` 通配需完整移植，非简化版；SBPL 须含 cargo/npm cache 子路径写入例外。
- **关键变更：**
  - 新增 `electron/main/agent/agent-execpolicy.ts`
  - 新增 `electron/main/agent/agent-sandbox-seatbelt.ts`
  - 新增 `electron/main/agent/agent-command-arity.ts`（从 `bash_arity` / `classify_command` 移植）
  - 修改 `electron/main/agent/agent-bash.ts`、`agent-bash-tasks.ts`
  - 修改 `electron/main/agent/tool-executor.ts`（execpolicy Deny 即时返回；AskUser 与 bash_pending 合并逻辑）
  - 修改 `electron/main/agent/agent-user-shell.ts`（用户 `!` shell 可选同路径沙箱）
  - 新增 `tests/unittest/UT-agent-os-sandbox/`
- **权衡：**
  - 收益：无 Rust 构建；与 Electron 一体；补齐 agent-bash-parity 二期沙箱债。
  - 风险：SBPL 与上游漂移需对照测试；非 macOS 仅 execpolicy + git 拦截，无内核级限制。
- **验证：**
  - Vitest：execpolicy 用例对齐 `DeepSeek-TUI/crates/tui/src/execpolicy/rules.rs` 测试
  - Vitest：Seatbelt 参数/SBPL 片段快照
  - macOS 手工：写项目外路径、curl 应被 Seatbelt 拒绝
- **待解决问题：** hooks / `agent-hooks.ts` 是否同期加沙箱（首版可仅 Agent Bash）；设置页暴露 sandbox_mode 可后续迭代。

### 未采纳方案说明

- **未选：** 提案 2 – Rust CLI 子进程桥接
- **原因：** 用户选型优先 Electron 最小集成与无 Rust 构建链。
