## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 实现 Cursor Smart Mode 智能审批；设置开关 `agentSmartModeApproval` 默认开启，关闭时与现有一致。
- **调研来源：** `docs/research/research-agent-tools-matrix.md` §2；`docs/research/research-cursor-agent-tools.md` §3.2
- **上游提案：** `docs/proposals/proposal-smart-mode-approval.md`（双方案草稿）
- **选定基础：** 提案 1 – LLM Auto-review 分类器 + 智能审批卡
- **用户调整摘要：** 无额外调整

### 最终方案 – LLM Auto-review + 智能审批卡

- **概述：** 对 Bash（非只读）、WebFetch、CallMcpTool、WebRun、Delete 在执行前调用 fast 模型分类器。`block` 时返回错误及 reason；Agent 带 `requestSmartModeApproval` + `smartModeBlockReason` 重试后展示 `ChatSmartApprovalCard`。用户放行后跳过审查执行工具，后续仍走既有 Write/Bash 审批链。
- **关键变更：** `agent-smart-review-classifier.ts`、`agent-smart-review.ts`、`agent-loop.ts`、IPC/UI、`agentSmartModeApproval` 配置（默认 true）。
- **验证：** 单测 + 危险命令手工验收；关开关后行为不变。
