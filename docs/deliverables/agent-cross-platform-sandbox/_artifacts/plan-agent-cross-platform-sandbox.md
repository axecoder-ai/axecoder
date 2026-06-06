# Agent 跨平台 OS 沙箱 设计文档

## 当前背景

- `agent-os-sandbox` 已交付 macOS Seatbelt + execpolicy；`buildShellSpawnSpec` 在 `agent-sandbox-seatbelt.ts`，非 darwin 退化为裸 shell。
- DeepSeek-TUI Linux 在 `prefer_bwrap` 且 `/usr/bin/bwrap` 存在时走 bubblewrap；Windows `is_available() == false`。
- 痛点：Linux Agent Bash 无 OS 级 FS 限制，仅靠 execpolicy 字符串匹配。

## 需求

### 功能需求

- 统一 `buildShellSpawnSpec(projectRoot, command, opts)` 平台分发
- macOS：现有 Seatbelt 行为不变
- Linux：`bwrap` 可用时包装 shell；read-only 模式仅 ro-bind cwd（或 skip write bind）
- Windows：`sandboxed: false`，不误报
- `detectSandboxDenial(exitCode, stderr, platform)` 统一拒绝检测
- 后台 Bash（`agent-bash-tasks.ts`）同路径

### 非功能需求

- 不引入 Rust/native addon
- 单测可 mock `process.platform` 或使用平台条件断言
- 最小 diff：不重写 execpolicy

## 设计决策

### 1. 模块拆分

- `agent-sandbox-seatbelt.ts` — macOS SBPL 生成（保留）
- `agent-sandbox-bwrap.ts` — Linux bwrap 参数构建 + `isBwrapAvailable`
- `agent-sandbox.ts` — `buildShellSpawnSpec`、`detectSandboxDenial`、re-export `SandboxMode`

### 2. Linux bwrap 策略

对齐 DeepSeek `bwrap.rs`：
- `--ro-bind / /`
- workspace-write：`--bind <cwd> <cwd>` + `--bind /tmp /tmp`（若存在）
- read-only：不添加 cwd write bind（仅 ro-bind root）
- `--chdir <cwd>`、`--unshare-all`、`-- <shell> <args>`

### 3. Windows

不实现 Job Object；spawn 普通 cmd，与 DeepSeek 当前状态一致。

## 技术设计

### 核心接口

```typescript
export type ShellSpawnSpec = { program: string; args: string[]; sandboxed: boolean; sandboxKind?: 'seatbelt' | 'bwrap' | 'none' }

export const buildShellSpawnSpec(projectRoot, command, opts?: { enabled?: boolean; mode?: SandboxMode }): ShellSpawnSpec
export const detectSandboxDenial(exitCode, stderr, kind?): boolean
```

### 文件变更

| 文件 | 操作 |
|------|------|
| `electron/main/agent/agent-sandbox-bwrap.ts` | 新增 |
| `electron/main/agent/agent-sandbox.ts` | 新增 |
| `electron/main/agent/agent-sandbox-seatbelt.ts` | 修改（移除 buildShellSpawnSpec） |
| `electron/main/agent/agent-bash.ts` | 修改 import |
| `electron/main/agent/agent-bash-tasks.ts` | 修改 import |
| `tests/unittest/UT-agent-cross-platform-sandbox/bwrap.test.ts` | 新增 |
| `tests/unittest/UT-agent-cross-platform-sandbox/sandbox-dispatch.test.ts` | 新增 |
| `tests/unittest/UT-agent-os-sandbox/seatbelt.test.ts` | 修改 import 路径 |

## 实施计划

1. **阶段一：** 新增 bwrap 模块 + 单测
2. **阶段二：** 新增 agent-sandbox.ts 分发 + 更新 bash 引用
3. **阶段三：** 回归全量 vitest + 落盘 implement 报告

## 测试策略

- bwrap 命令结构快照（mock cwd）
- dispatch：darwin→seatbelt 路径、linux+bwrap→bwrap、win32→none
- seatbelt 原测试改 import 后全绿

## 已知限制

- Linux 无 bwrap → 无 OS 沙箱
- Windows 无 OS 沙箱
- 网络：bwrap 默认不隔离网络（与 DeepSeek 文档一致）

## 参考资料

- `DeepSeek-TUI/crates/tui/src/sandbox/bwrap.rs`
- `docs/deliverables/agent-os-sandbox/`
