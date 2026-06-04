---
任务名: git-host-integration
完成日期: 2026-06-04
选定方案: 提案 1 – Git Forge 抽象层（跳过 install-github-app）
审查结论: 通过
单测: 348/348 全绿
---

# Git 托管集成 — 交付总结

## 1. 概述

**需求：** 将 Claude Code 的 GitHub 集成 1:1 移植到 AxeCoder，并支持 Gitee 与用户自配 Git 托管地址。

**本轮目标：** Forge 检测 + Agent PR 工作流 + gh 只读 Bash + 设置页 + `/commit-push-pr`；**不做** Anthropic GitHub App 安装向导。

**选型：** 推荐并选定提案 1；用户调整：跳过 `/install-github-app`。

**交付物目录：** `docs/deliverables/git-host-integration/_artifacts/`

---

## 2. 方案

- 新增 `electron/main/git-forge/`：remote 解析、gh 认证、forge prompt、PR URL 提取。
- Agent：`computeSimpleEnvInfo` + 动态 Git Safety/PR 段；Bash 注入 forge 环境变量。
- `gh pr view` 等只读命令自动执行。
- 设置：provider / webBase / apiBase / token。
- 斜杠：`/commit-push-pr`（`/pr`）。

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 核心 | Forge 抽象层 | 仅 prompt 轻量对齐 |
| Gitee/自建 | 结构化 | 靠 prompt |

**最终选定：** 提案 1 + 跳过 install-app 向导。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

阶段：git-forge 模块 → Agent 集成 → IPC/UI/斜杠 → 单测验收。全文见 `_artifacts/plan-git-host-integration.md`。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。要点：11 个新单测；348 测试全绿；token 存本地 config。

---

## 6. 单元测试执行情况

命令：`npm test` — **81 文件 / 348 用例全绿**。详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 单元：remote 解析、forge kind、只读 bash、PR URL 提取 — 通过。
- 手工：待用户在 GitHub/Gitee 仓库验证 `/commit-push-pr` 与 gh 只读命令。

---

## 8. 代码审查

结论：**通过**。非阻塞：token keytar、PR URL UI 持久化、完整 gh flag 校验。详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/git-forge/` | 新增 | Forge 核心 |
| `electron/main/agent/agent-bash-readonly.ts` | 新增 | gh 只读 |
| `electron/main/agent/agent-loop.ts` | 修改 | 自动 apply + PR |
| `electron/main/agent/agent-system-prompt.ts` | 修改 | env + prompt |
| `electron/main/agent/tool-executor.ts` | 修改 | Bash env |
| `electron/main/git-ipc.ts` | 修改 | IPC |
| `electron/main/models-types.ts` | 修改 | 设置字段 |
| `electron/main/config-store.ts` | 修改 | 默认值 |
| `src/components/workbench/GitForgeSettingsCard.vue` | 新增 | 设置 UI |
| `src/slash-commands/builtin.ts` | 修改 | `/commit-push-pr` |
| `tests/unittest/UT-git-forge/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

1. Chat UI 展示 `linkedPrUrl` 并持久化。
2. Gitee REST 封装（减少 curl 模板依赖）。
3. Token 安全存储（keytar）。
4. 完整移植 CC `readOnlyCommandValidation`。

---

## 11. 附录：过程文档索引

| 文件 | 说明 |
|------|------|
| [_artifacts/00-research-links.md](./_artifacts/00-research-links.md) | 调研链接 |
| [_artifacts/02-selection.md](./_artifacts/02-selection.md) | 选型记录 |
| [_artifacts/proposal-git-host-integration.md](./_artifacts/proposal-git-host-integration.md) | 已确认方案 |
| [_artifacts/plan-git-host-integration.md](./_artifacts/plan-git-host-integration.md) | 实施计划 |
| [_artifacts/05-implement-report.md](./_artifacts/05-implement-report.md) | 实现报告 |
| [_artifacts/05-unittest.md](./_artifacts/05-unittest.md) | 单测输出 |
| [_artifacts/06-code-review.md](./_artifacts/06-code-review.md) | 代码审查 |
