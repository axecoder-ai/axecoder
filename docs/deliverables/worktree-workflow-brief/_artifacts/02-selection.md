# 选型记录

## 2a 选型摘要

### 一句话需求回顾

将 Agent 扩展工具 `EnterWorktree`/`ExitWorktree`、`Workflow`、`Brief` 从 stub 升级为可调用真实现，与 git worktree 隔离、斜杠工作流 playbook、Brief 用户交互语义对齐；边界为 feature flag 控制，不重构 IDE 工作区切换。

### 方案对比表

| 维度 | 提案 1 单模块最小真实现 | 提案 2 分模块深度对标 |
|------|------------------------|----------------------|
| 核心思路 | runGit worktree + ctx.projectRoot 切换；主进程加载 playbook；Brief 复用 ask_pending | 独立 Brief UI/IPC；Workflow 注入 roleWorkflowInvoke；best-of-n 自动 worktree |
| 主要改动范围 | `agent-worktree.ts`、`agent-workflow.ts`、`agent-ext-executor.ts`、单测 | 上述 + renderer/IPC/session-store/subagent |
| 优点 | 改动小、1–2 人日、立即消除 stub | 体验更接近 同类 Agent |
| 缺点 / 风险 | IDE 根目录不同步；Brief 无专用 UI | 改动面大、4–5 人日、UI 重复风险 |
| 工作量（粗估） | 小 | 大 |
| 适合场景 | 快速补齐工具矩阵、best-of-n 隔离 | 产品级 Brief/Workflow 体验 |

### 关键差异说明

- 选提案 1：Worktree 真创建 git worktree 并切换 Agent ctx，不碰 Chat UI。
- 选提案 2：额外做 Brief 专用卡片与 best-of-n 自动 Enter。
- Workflow：提案 1 返回 playbook 文本；提案 2 还可标记 roleWorkflowInvoke。
- Brief：提案 1 走 AskUserQuestion 通道；提案 2 新 pending 类型。
- 两者均不自动切换 IDE 打开文件夹。
- 提案 1 可后续单独 rppit 升级 Brief UI。

### 推荐方案

**推荐：提案 1 – 单模块最小真实现（复用现有管线）**

理由：与 agent-tool-layer-parity Wave4「最小可调用」目标一致；复用 `runGit`、`loadBuiltinCommand`、`ask_pending`；风险与改动面最小，单测可 mock 覆盖。

### 选型提示

下一步通过选择题确认；完整细节见 `docs/proposals/proposal-worktree-workflow-brief.md`。

---

## 2b 用户最终选择

- **选定提案：** 提案 1 – 单模块最小真实现（复用现有管线）
- **调整说明：** 无额外调整，按提案原文落地
