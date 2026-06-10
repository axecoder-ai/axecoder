# 方案选型记录

## 一句话需求回顾

为 AxeCoder Agent 实现「取消 Shell」：模型可通过工具终止 `run_in_background: true` 启动且仍在运行的后台 Bash 任务，补齐 `research-agent-tools-matrix.md` 中「取消 Shell = 部分 stop」缺口。

## 方案对比表

| 维度 | 提案 1 扩展 TaskStop | 提案 2 新增 KillShell |
|------|---------------------|------------------------|
| 核心思路 | TaskStop 同时停子代理与 shell | 新工具 KillShell 专停 shell |
| 主要改动范围 | agent-bash-tasks、TaskStop 分支、stopAgentTurn | 同上 + 新工具注册与权限 |
| 优点 | API 面最小，与 TaskOutput 契约一致 | 语义清晰、与子代理解耦 |
| 缺点 / 风险 | TaskStop 语义变宽 | 工具池 +1，模型选型成本 |
| 工作量（粗估） | 小 | 中 |
| 适合场景 | 已有后台 Bash + TaskOutput 路径 | 需与 Reasonix kill_shell 命名对齐 |

## 关键差异说明

- 选提案 1：模型继续用 `TaskStop` + `task_id`，与读输出的 `TaskOutput` 成对。
- 选提案 2：停 shell 必须调用 `KillShell`，`TaskStop` 仅停子代理。
- 两方案均需 `agent-bash-tasks` 保存进程引用并 SIGTERM/SIGKILL。
- 前台同步 Bash 两方案首版均不强制纳入（进程阻塞在 apply 内）。
- 提案 1 改动文件更少，单测与 agent-bash-parity 延续性好。

## 推荐方案

**推荐：提案 1 – 扩展 TaskStop 统一取消后台任务**

理由：agent-bash-parity 已建立「后台 Bash → task_id → TaskOutput」路径；扩展 TaskStop 最小 diff、无新工具名，与 Claude Code TaskStop 习惯一致。

## 用户最终选择

- **选定提案：** 提案 1 – 扩展 TaskStop 统一取消后台任务
- **调整说明：** 无额外调整，按方案原文落地
