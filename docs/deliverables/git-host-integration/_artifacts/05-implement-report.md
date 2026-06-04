# 功能实现报告

## 功能说明

- **Git Forge 抽象层**（`electron/main/git-forge/`）：解析 `origin` remote，识别 GitHub / Gitee / 自建 host；合并用户设置 `gitForgeProvider`、`gitForgeApiBase`、`gitForgeWebBase`、`gitForgeAccessToken`。
- **Agent 环境**：`computeSimpleEnvInfo` 追加 remote、forge 类型、gh 认证状态。
- **系统 prompt**：注入 CC 同款 Git Safety + PR/MR 工作流（GitHub 用 `gh`，Gitee 用 API curl 模板，custom 用 GH_HOST/gh 或 host API）。
- **Bash 只读放行**：`gh pr view/list/diff/checks/status`、`gh issue view/list/status` 等自动执行，无需用户点批准。
- **Bash 环境**：执行前注入 `GH_HOST` / `GH_TOKEN` / `GITEE_TOKEN`（来自设置）。
- **PR URL 跟踪**：Bash 成功后从 stdout 解析 PR/MR URL 写入 session `linkedPrUrl`。
- **斜杠命令**：`/commit-push-pr`（别名 `/pr`）注入 forge 感知任务 prompt。
- **设置 UI**：General → Git hosting 卡片（provider、web/api base、token）。
- **IPC**：`git:forgeStatus`、`git:commitPushPrPrompt`、`git:openUrl`。
- **明确未做**：`/install-github-app` Anthropic OAuth 向导。

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/git-forge/*` | 新增 forge 模块 |
| `electron/main/agent/agent-bash-readonly.ts` | gh 只读检测 |
| `electron/main/agent/agent-bash.ts` | 可选 envOverride |
| `electron/main/agent/agent-loop.ts` | 只读自动 apply + PR 解析 |
| `electron/main/agent/agent-system-prompt.ts` | env + forge prompt 段 |
| `electron/main/agent/tool-executor.ts` | Bash forge 环境 |
| `electron/main/git-ipc.ts` | 扩展 IPC |
| `electron/main/models-types.ts` / `config-store.ts` | 设置字段 |
| `electron/preload/index.ts` / `src/types/axecoder.d.ts` | 类型与桥接 |
| `src/slash-commands/builtin.ts` | `/commit-push-pr` |
| `src/components/workbench/GitForgeSettingsCard.vue` | 设置 UI |
| `src/components/workbench/GeneralTab.vue` 等 | 挂载卡片 |
| `tests/unittest/UT-git-forge/git-forge.test.ts` | 单测 |

## 注意事项

- Token 存 `~/.axecoder/config.json`，与现有 API key 策略一致；生产环境建议后续改 keytar。
- Gitee 无 `gh`，依赖 curl + `$GITEE_TOKEN`；需在设置中配置 token。
- 企业 GitHub：填 `gitForgeWebBase` 并安装配置好 `gh` CLI。
