# 已确认解决方案提案：Agent 跨平台 OS 沙箱

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 在 macOS Seatbelt + execpolicy 基础上，补齐 Linux OS 级沙箱；Windows 与 DeepSeek 一致不宣称 FS 沙箱。
- **调研来源：** `docs/deliverables/agent-cross-platform-sandbox/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-agent-cross-platform-sandbox.md`（双方案草稿）
- **选定基础：** 提案 1 – TypeScript 统一 SandboxManager + Linux bwrap
- **用户调整摘要：** 无额外调整

---

### 最终方案 – TypeScript 统一 SandboxManager + Linux bwrap

- **概述：** 新增 `agent-sandbox.ts` 作为统一入口，`buildShellSpawnSpec` 按平台分发：macOS 沿用 Seatbelt；Linux 在 `/usr/bin/bwrap` 可用时用 bubblewrap 包装（`--ro-bind / /`、`--bind cwd`、`--chdir`、`--unshare-all`）；Windows 不包装 OS 沙箱，仅 execpolicy。保留 `SandboxMode`、`getWritableRoots`、denial 检测；后台 Bash 同路径。
- **关键变更：**
  - 新增 `electron/main/agent/agent-sandbox-bwrap.ts`
  - 新增 `electron/main/agent/agent-sandbox.ts`（平台分发）
  - 修改 `agent-sandbox-seatbelt.ts`（移除 `buildShellSpawnSpec`，保留 Seatbelt 专用 API）
  - 修改 `agent-bash.ts`、`agent-bash-tasks.ts` 引用 `agent-sandbox.ts`
  - 新增 `tests/unittest/UT-agent-cross-platform-sandbox/`
- **权衡：**
  - 收益：Linux 真实 FS 隔离；无 Rust；与 DeepSeek bwrap 路径一致。
  - 风险：无 bwrap 时 Linux 仍裸 shell；Windows 无 OS 级隔离。
- **验证：**
  - Vitest：bwrap 参数快照、平台 mock 分支
  - macOS 回归：原 Seatbelt 单测
  - Linux 实机（可选）：有 bwrap 时写项目外失败
- **待解决问题：** Plan 模式 read-only 映射、设置页 sandbox 开关可后续迭代。

### 未采纳方案说明

- **未选：** 提案 2 – Rust sandbox-helper
- **原因：** 用户选型优先 Electron 纯 TS、无 Rust 构建链。
