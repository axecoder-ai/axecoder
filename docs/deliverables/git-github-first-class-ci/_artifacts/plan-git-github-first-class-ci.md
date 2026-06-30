# Git/GitHub 一等公民 + CI 设计文档

## 当前背景

- git-host-integration 已完成 forge 检测、主 Agent PR prompt、部分 gh 只读、Bash forge 环境。
- 子代理（ci-investigator/git-commit）无 forge 段；CI 无专段 prompt；本地 git 仍走 Bash。

## 需求

### 功能需求

- GitStatus / GitDiff / GitLog 只读 Agent 工具（主进程 git 子进程）。
- forge-prompt 增加 CI 段；`/investigate-ci` 斜杠。
- gh 只读扩展：`gh run view/list`、`gh workflow view/list`。
- 子代理 system prompt 注入 forge + CI 段。
- linkedPrUrl 写入 Environment 提示。
- CI/PR 远程：**仅** Bash + git-forge 注入。

### 非功能需求

- 最小改动；Git 工具只读、无需用户批准。
- Token 仍走现有 config，不落日志。

## 设计决策

### 1. Git 三工具 vs 单 Git 工具

三工具 GitStatus/GitDiff/GitLog — 与 Read/Grep 同级、模型易选。

### 2. CI 路径

不新增 github_* REST 工具；gh + forgeEnvForBash + 只读白名单。

## 实施计划

1. **forge-prompt + bash-readonly + subagent prompt**
2. **git-agent-read.ts + tool-executor + tool-defs**
3. **IPC + 斜杠 + linkedPrUrl**
4. **单测 + 报告**

## 文件变更

- `electron/main/git-forge/forge-prompt.ts`
- `electron/main/git-forge/git-agent-read.ts`（新）
- `electron/main/agent/agent-bash-readonly.ts`
- `electron/main/agent/agent-subagent-types.ts`
- `electron/main/agent/agent-system-prompt.ts`
- `electron/main/agent/agent-tool-prompts.ts`
- `electron/main/agent/agent-types.ts`
- `electron/main/agent/tool-executor.ts`
- `electron/main/agent/agent-loop.ts`
- `electron/main/git-ipc.ts`
- `electron/preload/index.ts`
- `src/types/axecoder.d.ts`
- `src/slash-commands/builtin.ts`
- `tests/unittest/UT-git-forge/git-forge.test.ts`
- `tests/unittest/UT-git-agent-tools/git-agent-tools.test.ts`（新）
