# 代码审查：create_plan + Plan Build UI

## 结论

**通过**（无阻塞项）

## 功能对照

- [x] CreatePlan 工具 + create_plan 别名
- [x] planMode 门控
- [x] 写 docs/plans/plan-*.md + frontmatter
- [x] plan_pending 与聊天 Build/Dismiss
- [x] 编辑器 plan 文件 Build 按钮
- [x] Build 注入 implement playbook

## 质量

- [x] 复用 ask_pending 模式，改动面可控
- [x] IPC/preload/类型一致
- [x] 单测 9 例全绿；回归 switch-mode / tool-prompts / layer-parity 通过

## 非阻塞待办

1. 聊天 Build 后 planMode/chatMode 同步已通过 emitAgentProgress；若会话已开始，system prompt 中 chat-mode addon 不热更新（与 SwitchMode 已知限制一致）。
2. 可选：CreatePlan todos 同步 TodoWrite。
3. 可选：更新 `research-agent-tools-matrix.md` create_plan 行。

## 安全

- plan 路径限制在项目根内（writePlanFile 校验）。
- Build 不绕过写/Bash 审批，仅注入用户消息进入 agent 模式。
