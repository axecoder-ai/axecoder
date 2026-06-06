# 调研链接

- `DeepSeek-TUI/docs/SANDBOX.md` — 平台沙箱威胁模型；macOS Seatbelt 为 Enforced
- `DeepSeek-TUI/crates/tui/src/sandbox/seatbelt.rs` — SBPL 策略生成、`sandbox-exec` 包装
- `DeepSeek-TUI/crates/tui/src/sandbox/policy.rs` — `SandboxPolicy`（workspace-write / read-only 等）
- `DeepSeek-TUI/crates/tui/src/sandbox/mod.rs` — `SandboxManager` 入口与平台分发
- `DeepSeek-TUI/crates/tui/src/execpolicy/rules.rs` — TOML execpolicy 评估（allow/deny/AskUser）
- `DeepSeek-TUI/crates/execpolicy/src/lib.rs` — 上游 ExecPolicyEngine（Rust crate）
- `DeepSeek-TUI/crates/tui/src/tools/shell.rs` — execpolicy → safety → Seatbelt 执行链
- `electron/main/agent/agent-bash.ts` — 当前无 OS 沙箱，仅 `isDangerousGitCommand`
- `electron/main/agent/agent-bash-tasks.ts` — 后台 Bash 同样裸 spawn
- `electron/main/agent/tool-executor.ts` — Bash `bash_pending` 审批后调用 `runAgentBash`
- `electron/main/agent/agent-permissions.ts` — Bash 默认 `ask` 审批门
- `docs/deliverables/agent-bash-parity/_artifacts/proposal-agent-bash-parity.md` — 一期明确「沙箱列为二期」
- `electron/main/axecoder-dir.ts` — 全局配置目录 `~/.axecoder`

**调研缺口：** AxeCoder 为 TypeScript/Electron，DeepSeek-TUI 为 Rust；无现成 FFI 桥接。Linux Landlock/seccomp 本期用户仅要求 macOS Seatbelt + execpolicy。
