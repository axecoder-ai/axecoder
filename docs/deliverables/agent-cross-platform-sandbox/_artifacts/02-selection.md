# 选型记录

## 2a 选型摘要

**需求回顾：** 在 macOS Seatbelt + execpolicy 已交付基础上，补齐 Linux（及 Windows 降级策略）OS 级沙箱，对齐 DeepSeek-TUI 跨平台思路。

| 维度 | 提案 1 – TS SandboxManager + Linux bwrap | 提案 2 – Rust sandbox-helper |
|------|------------------------------------------|------------------------------|
| 核心思路 | 统一 agent-sandbox 平台分发；Linux bwrap | Rust CLI + Landlock/seccomp |
| 改动范围 | agent-sandbox*.ts、bash 集成、单测 | Rust crate + 打包 + spawn |
| 优点 | 无 Rust、改动小、Linux 真实 FS 隔离 | 无 bwrap 依赖、seccomp |
| 缺点 | 需用户装 bwrap；Windows 仅 execpolicy | 构建链重、包体大 |
| 工作量 | 小–中 | 大 |

**推荐：** 提案 1 — 与 agent-os-sandbox TypeScript 路线一致。

## 2b 用户选择

- **选定提案：** 提案 1 – TypeScript 统一 SandboxManager + Linux bwrap
- **调整说明：** 无额外调整，按提案默认范围落地
