# Git 托管集成 设计文档

## 当前背景

- AxeCoder Agent 已有 Bash、git:status，但无 CC 级 GitHub PR 工作流。
- CC 通过 gh CLI + 只读命令白名单 + `/commit-push-pr` + 环境段完成集成。
- 用户需 Gitee 与国内/自建 Git 托管支持。

## 需求

### 功能需求

- 从 `git remote` 自动检测 forge（GitHub / Gitee / custom）。
- 设置页配置：provider（auto/github/gitee/custom）、apiBase、webBase、Gitee access token。
- 系统 prompt 注入 forge 状态（remote、gh 认证、forge 类型）。
- Bash：`gh pr view/list/diff/checks/status`、`gh issue view/list/status` 只读自动执行（无需批准）。
- 斜杠 `/commit-push-pr`：注入 CC 同款 Git Safety + PR 流程（forge 分支：gh vs Gitee API）。
- Bash 成功后从 stdout 解析 PR/MR URL。
- **不做** `/install-github-app` OAuth 向导。

### 非功能需求

- 最小改动：复用现有 Bash pending / auto-apply 路径。
- Token 存 `~/.axecoder/config.json`（与现有 API key 策略一致，文档注明风险）。

## 设计决策

### 1. Forge 抽象

- `detect-forge.ts` 解析 remote URL + 合并用户 `gitForgeProvider` 覆盖。
- GitHub 企业：`gitForgeWebBase` + 运行 gh 时注入 `GH_HOST`。

### 2. Gitee

- 无官方 gh；prompt 提供 `curl` + `https://gitee.com/api/v5` 创建 PR 模板。
- Token 通过 `GITEE_TOKEN` 环境变量注入 Bash（来自设置，不落日志）。

### 3. 只读 Bash

- `isReadOnlyBashCommand()` 前缀匹配；`agent-loop` 对只读 Bash 视同 `perm=allow` 自动 apply。

## 实施计划

1. **阶段一：git-forge 模块 + 单测**
   - forge-types、detect-forge、gh-auth、forge-prompt、git-operation-tracking
2. **阶段二：Agent 集成**
   - agent-bash-readonly、agent-loop、computeSimpleEnvInfo、buildAgentSystemPrompt
3. **阶段三：IPC + UI + 斜杠**
   - git-ipc 扩展、GitForgeSettingsCard、/commit-push-pr、preload/types
4. **阶段四：验收**
   - vitest 全绿、implement/code-review 报告

## 文件变更

| 路径 | 类型 |
|------|------|
| `electron/main/git-forge/*.ts` | 新增 |
| `electron/main/agent/agent-bash-readonly.ts` | 新增 |
| `electron/main/git-ipc.ts` | 修改 |
| `electron/main/models-types.ts` | 修改 |
| `electron/main/config-store.ts` | 修改 |
| `electron/main/agent/agent-system-prompt.ts` | 修改 |
| `electron/main/agent/agent-loop.ts` | 修改 |
| `electron/main/agent/agent-permissions.ts` | 修改 |
| `electron/preload/index.ts` | 修改 |
| `src/types/axecoder.d.ts` | 修改 |
| `src/slash-commands/builtin.ts` | 修改 |
| `src/components/workbench/GitForgeSettingsCard.vue` | 新增 |
| `src/components/workbench/GeneralTab.vue` | 修改 |
| `tests/unittest/UT-git-forge/*.test.ts` | 新增 |

## 测试策略

- 单元：`parseGitRemoteUrl`、`resolveForgeKind`、`isReadOnlyBashCommand`、`extractPullRequestFromOutput`
- 集成：不依赖真实 gh 网络（mock spawn 可选，V1 纯函数为主）
