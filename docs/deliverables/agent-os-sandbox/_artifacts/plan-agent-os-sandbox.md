# Agent OS 级沙箱 设计文档

## 当前背景

- AxeCoder Agent Bash（`agent-bash.ts`）直接 `spawn` shell，仅有 `isDangerousGitCommand` 硬编码拦截。
- `agent-bash-parity` 一期将沙箱列为二期；DeepSeek-TUI 已实现 macOS Seatbelt + execpolicy 完整链路。
- 仓库内 `DeepSeek-TUI/` 为参考实现，AxeCoder 为 TypeScript/Electron。

## 需求

### 功能需求

- macOS：Agent Bash / 后台 Bash / 用户 `!` shell 经 `sandbox-exec` 包装，默认 `workspace-write`、禁止网络。
- execpolicy：读取 `~/.axecoder/execpolicy.toml`，执行前评估 allow/deny/AskUser。
- 完整移植 arity-aware 前缀匹配、heredoc 规范化、cargo/npm SBPL 例外。
- execpolicy Deny 即时拒绝；AskUser 与现有 `bash_pending` 审批叠加。

### 非功能需求

- 非 macOS：跳过 Seatbelt，保留 execpolicy + git 拦截。
- 单测对齐 DeepSeek-TUI `rules.rs` / `matcher` 用例。

## 设计决策

### 1. TypeScript 移植（非 Rust CLI）

- 理由：Electron 栈一致、无构建链、改动面集中。

### 2. execpolicy 与 Seatbelt 分层

- execpolicy：应用层「该不该跑」
- Seatbelt：内核层「跑了能碰什么」

## 技术设计

### 核心模块

| 文件 | 职责 |
|------|------|
| `agent-bash-arity-table.ts` | BASH_ARITY_TABLE 数据 |
| `agent-command-arity.ts` | classifyCommand、prefixAllowMatches |
| `agent-execpolicy-matcher.ts` | normalizeCommand、patternMatches |
| `agent-execpolicy.ts` | TOML 加载、evaluate |
| `agent-sandbox-seatbelt.ts` | SBPL 生成、sandbox-exec 参数 |
| `agent-bash.ts` | 集成 execpolicy + seatbelt |

### 文件变更

- 新增：`electron/main/agent/agent-bash-arity-table.ts`
- 新增：`electron/main/agent/agent-command-arity.ts`
- 新增：`electron/main/agent/agent-execpolicy-matcher.ts`
- 新增：`electron/main/agent/agent-execpolicy.ts`
- 新增：`electron/main/agent/agent-sandbox-seatbelt.ts`
- 修改：`electron/main/agent/agent-bash.ts`
- 修改：`electron/main/agent/agent-bash-tasks.ts`
- 修改：`electron/main/agent/tool-executor.ts`
- 新增：`tests/unittest/UT-agent-os-sandbox/*.test.ts`

## 实施计划

1. **阶段一：策略引擎**
   - 移植 arity 表与 matcher
   - execpolicy TOML 解析与 evaluate
   - 单测对齐上游用例

2. **阶段二：Seatbelt**
   - SBPL 生成（base + write + cargo/npm + network）
   - `wrapShellSpawn` 返回 sandbox-exec 参数
   - 单测快照 SBPL 片段

3. **阶段三：集成**
   - `runAgentBash` / `startBackgroundBash` 接入
   - `tool-executor` execpolicy Deny 前置检查
   - 全量 `npm test`

## 测试策略

- `UT-agent-os-sandbox/execpolicy.test.ts` — allow/deny/ask、arity、wildcard
- `UT-agent-os-sandbox/seatbelt.test.ts` — policy 字符串、params
- 复用 `UT-agent-bash` 确保回归

## 安全考量

- 默认 workspace-write + 无网络
- `.axecoder` 目录在 writable root 内只读保护

## 已知限制

- Linux Landlock / Windows Job Object 本期不做
- hooks 执行路径首版不加 Seatbelt

## 参考资料

- `DeepSeek-TUI/docs/SANDBOX.md`
- `DeepSeek-TUI/crates/tui/src/sandbox/seatbelt.rs`
- `DeepSeek-TUI/crates/tui/src/execpolicy/rules.rs`
