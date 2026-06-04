## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 移植 CC GitHub 集成至 AxeCoder（1:1），新增 Gitee 与自配 Git 托管地址。
- **调研来源：** `docs/deliverables/git-host-integration/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-git-host-integration.md`（make-proposals 双方案版）
- **选定基础：** 提案 1 – Git Forge 抽象层
- **用户调整摘要：** **跳过** `/install-github-app` / Anthropic GitHub Actions App 安装向导；聚焦 Agent PR 工作流、gh 只读放行、forge 设置与环境注入。

### 现状总结

- CC：`BashTool/prompt.ts` PR 段落、`/commit-push-pr`、`readOnlyCommandValidation`（gh 只读）、`gitOperationTracking`、`ghAuthStatus`。
- AxeCoder：仅 `git:status`、Bash 危险 git 拦截、提示词中 `owner/repo#123` 格式；无 forge 层。

---

### 最终方案 – Git Forge 抽象层（无 install-app 向导）

- **概述：** 新增 `electron/main/git-forge/`，按 remote + 用户设置解析 forge（github / gitee / custom）；移植 gh 只读 Bash 自动放行；系统 prompt 注入 forge 环境与 CC 同款 PR 工作流段落；斜杠 `/commit-push-pr` 注入 forge 感知 prompt；设置页「代码托管」卡片（provider、apiBase、webBase、Gitee token）；Bash 成功后解析 PR/MR URL；**不实现** Anthropic GitHub App OAuth 向导。
- **相对选定提案的变更：** 移除 `/install-github-app`、`/git-forge-setup` OAuth 步骤；Gitee 以 REST API + curl 模板 + 可选 token 环境变量为主，不捆绑第三方 CLI。
- **关键变更：**
  - `electron/main/git-forge/*`
  - `electron/main/agent/agent-bash-readonly.ts`
  - `electron/main/agent/agent-system-prompt.ts`、`agent-loop.ts`、`agent-permissions.ts`
  - `electron/main/git-ipc.ts`
  - `src/slash-commands/builtin.ts` — `/commit-push-pr`
  - `src/components/workbench/GitForgeSettingsCard.vue`
  - `AppConfig` / `AppSettings` — `gitForge*` 字段
  - `tests/unittest/UT-git-forge/`
- **权衡：** GitHub 路径与 CC 对齐；Gitee/自建依赖 token 与 API 模板，体验略弱于 gh。
- **验证：** 单测 remote 解析、只读 bash、PR URL 提取；手工 GitHub `gh pr create`；Gitee MR curl 模板。
- **待解决问题：** token 安全存储策略；Windows gh 路径；Gitee Actions 机器人无 CC 等价物。

### 未采纳方案说明

- **未选：** 提案 2 – Bash/Prompt 轻量对齐
- **原因：** 无法满足 Gitee/自配 host 结构化需求；用户选定提案 1。
