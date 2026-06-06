# 功能实现报告

## 功能说明

新增跨平台沙箱统一入口 `agent-sandbox.ts`：

- **macOS**：沿用 Seatbelt（`sandbox-exec`），行为与 agent-os-sandbox 一致
- **Linux**：检测 `/usr/bin/bwrap` 可用时用 bubblewrap 包装 shell（`--ro-bind / /`、writable roots bind、`--chdir`、`--unshare-all`）
- **Windows**：不包装 OS 沙箱（`sandboxed: false`），与 DeepSeek-TUI 当前状态一致
- **read-only 模式**：Linux bwrap 仅 ro-bind，不添加 write bind

`agent-bash.ts` / `agent-bash-tasks.ts` 改引用 `agent-sandbox.ts`。

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/agent/agent-sandbox-bwrap.ts` | 新增 Linux bwrap |
| `electron/main/agent/agent-sandbox.ts` | 新增平台分发 |
| `electron/main/agent/agent-sandbox-seatbelt.ts` | 移除 buildShellSpawnSpec |
| `electron/main/agent/agent-bash.ts` | import 更新 |
| `electron/main/agent/agent-bash-tasks.ts` | import 更新 |
| `tests/unittest/UT-agent-cross-platform-sandbox/bwrap.test.ts` | 新增 |
| `tests/unittest/UT-agent-cross-platform-sandbox/sandbox-dispatch.test.ts` | 新增 |
| `tests/unittest/UT-agent-os-sandbox/seatbelt.test.ts` | 调整 import |

## 注意事项

- Linux 无 bwrap 时退化为裸 shell + execpolicy
- bwrap 不隔离网络（与 DeepSeek 文档一致）
- npm/cargo cache 通过 `getWritableRoots` 在 workspace-write 下 bind 可写路径
