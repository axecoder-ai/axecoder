# 方案选型记录

## 2a 选型摘要

### 一句话需求回顾

将 Git/GitHub 提升为 Agent 一等公民：本地 git 有专用只读工具，CI/PR 远程操作仍经 Bash + git-forge 环境注入（不新增 `github_*` REST 工具）。

### 方案对比表

| 维度 | 提案 1 Forge Prompt 深度对齐 | 提案 2 Git 只读工具 + Bash CI |
|------|------------------------------|-------------------------------|
| 核心思路 | 扩展 prompt/只读白名单/子代理注入 | 提案 1 + GitStatus/GitDiff/GitLog 原生工具 |
| 主要改动范围 | git-forge、agent prompt、bash-readonly、斜杠 | 上述 + git 工具、tool-executor、tool-defs |
| 优点 | 最小改动、完全符合 Bash+forge 约束 | 闭合 git status/diff/log 矩阵缺口；CI 仍 Bash |
| 缺点 / 风险 | 本地 git 仍走 Bash | 改动面较大；工具边界需清晰 |
| 工作量 | 小 | 中 |
| 适合场景 | 只要 CI/PR 对齐 | 要 Git 一等公民 + CI Bash 路径 |

### 关键差异

- 提案 1 不新增 Agent 工具；提案 2 新增 Git 只读三件套。
- 两者 CI 路径相同：gh + forge 注入 + 扩展只读白名单。
- 提案 2 减少 `git status` 等 Bash 批准摩擦。

### 推荐

**推荐：提案 1** — 与用户「CI 仍靠 Bash + git-forge 注入」约束最一致、改动最小。

## 2b 用户最终选择

- **选定：提案 2 – Git 只读原生工具 + Bash CI（混合一等公民）**
- **调整说明：** 无额外调整，按方案全文落地
