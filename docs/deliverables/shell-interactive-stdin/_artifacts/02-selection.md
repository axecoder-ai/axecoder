# 选型记录

## 2a 选型摘要

### 一句话需求回顾

在 AxeCoder Agent 中实现「Shell 交互 stdin」，使模型能对**运行中的后台 Shell** 写入 stdin（对齐 Cursor `WRITE_SHELL_STDIN` / 矩阵 §2 缺口），并补齐矩阵「未实现 → 已实现/部分」。

### 方案对比表

| 维度 | 提案 1 独立 ShellStdin + 可交互后台 Shell | 提案 2 Bash 内嵌 stdin 参数 |
|------|------------------------------------------|----------------------------|
| 核心思路 | 新工具 `ShellStdin` 向后台任务写 stdin；Bash 后台保留 stdin pipe | Bash 增加 `stdin` 参数，启动时一次性写入并 end |
| 主要改动范围 | `agent-bash-tasks`、新工具注册、ext executor | `agent-bash`、`tool-executor`、Bash schema |
| 优点 | 多轮交互；对齐 Cursor/DeepSeek 语义；与 TaskOutput 组合 | 改动最小；单轮管道场景简单 |
| 缺点 / 风险 | 模型需三工具协作 | 无法对已运行进程二次写 stdin；矩阵仍「部分」 |
| 工作量（粗估） | 中 | 小 |
| 适合场景 | npm/pip/交互式 CLI、多轮 prompt | sudo -S、yes \|、固定 heredoc |

### 关键差异说明

- 选提案 1：模型可「先 TaskOutput 看 prompt，再 ShellStdin 回答」，真正交互。
- 选提案 2：只能启动前注入 stdin，不能读输出后再决定输入。
- 提案 1 需扩展后台 spawn 为 stdin pipe；提案 2 仅改 spawn stdio 一次。
- 两者可合并：提案 1 为主 + Bash 可选 `stdin` 覆盖一次性场景。
- 前台 Bash 仍保持非持久 shell；交互仅限后台任务路径。
- UI 审计日志为可选，非阻塞。

### 推荐方案

**推荐：提案 1 – 独立 ShellStdin 工具 + 可交互后台 Shell**

理由：与 `research-agent-tools-matrix.md` 目标一致；复用已有 `run_in_background` + `TaskOutput`；Bash 内嵌 stdin 可作为补充而非替代。

### 选型提示

下一步通过选择题确认；完整细节见 `docs/proposals/proposal-shell-interactive-stdin.md`。

---

## 2b 用户最终选择

- **选定提案：** 提案 1 – 独立 ShellStdin 工具 + 可交互后台 Shell
- **调整说明：** 提案 1 为主，**同时**给 Bash 加可选 `stdin` 参数（合并两者）
