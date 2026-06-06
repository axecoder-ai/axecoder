# 调研链接

## 上游参考（DeepSeek-TUI / CodeWhale）

- `DeepSeek-TUI/docs/SANDBOX.md` — 跨平台威胁模型：macOS Seatbelt、Linux Landlock/seccomp/bwrap、Windows Job Object v1
- `DeepSeek-TUI/crates/tui/src/sandbox/mod.rs` — `SandboxManager.prepare()` 平台分发
- `DeepSeek-TUI/crates/tui/src/sandbox/seatbelt.rs` — macOS SBPL + sandbox-exec
- `DeepSeek-TUI/crates/tui/src/sandbox/bwrap.rs` — Linux bubblewrap 包装（`--ro-bind / / --bind cwd --chdir --unshare-all`）
- `DeepSeek-TUI/crates/tui/src/sandbox/landlock.rs` — Landlock syscall（需 helper；TUI 侧 prefer_bwrap 时走 bwrap）
- `DeepSeek-TUI/crates/tui/src/sandbox/windows.rs` — Windows 尚未 advertise（`is_available() == false`）
- `DeepSeek-TUI/crates/tui/src/sandbox/policy.rs` — `SandboxPolicy`（read-only / workspace-write / danger-full-access）

## AxeCoder 现状（agent-os-sandbox 已交付）

- `electron/main/agent/agent-sandbox-seatbelt.ts` — **仅 macOS** Seatbelt；`buildShellSpawnSpec` 非 darwin 退化为裸 shell
- `electron/main/agent/agent-bash.ts` — 调用 `buildShellSpawnSpec` + execpolicy
- `electron/main/agent/agent-bash-tasks.ts` — 后台 Bash 同路径
- `electron/main/agent/agent-execpolicy.ts` — TOML 策略（deny 已接入；ask 未完全接入）
- `electron/main/config-store.ts` — `agentOsSandboxEnabled` 默认 true
- `docs/deliverables/agent-os-sandbox/agent-os-sandbox-交付总结.md` — 遗留：**Linux Landlock 移植**、设置页 sandbox_mode

## 调研缺口

- AxeCoder 无 Rust 构建链；Landlock/seccomp 需 native 代码或外部 bwrap 二进制
- DeepSeek Windows 沙箱本身未落地；AxeCoder Windows 只能 execpolicy 或自研 Job Object helper
- Electron 打包需确认 Linux 目标是否包含 bwrap 依赖说明（用户自行安装）
