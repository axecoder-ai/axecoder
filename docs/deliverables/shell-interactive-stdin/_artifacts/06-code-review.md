# 代码审查

**范围：** Shell 交互 stdin（ShellStdin + Bash stdin + agent-bash-tasks pipe）

**对照：** `docs/proposals/proposal-shell-interactive-stdin.md`、`docs/plans/plan-shell-interactive-stdin.md`

## 功能

- [x] ShellStdin 向 running 任务写 stdin，错误路径明确
- [x] Bash 可选 stdin 启动注入
- [x] TaskOutput 仍可读 shell 任务；输出含 stdin 状态
- [x] 权限：ShellStdin 与 TaskOutput 同级自动 allow

## 质量

- [x] 9 个专项单测 + 全量 626 绿
- [x] `resetShellTasksForTests` 隔离测试状态
- [x] 改动面聚焦 agent 主进程，无 UI 变更（符合用户调整）

## 安全

- [x] ShellStdin 不执行新 shell 命令，不绕过 execpolicy
- [x] stdin 长度封顶 64KB
- [x] 仅对已存在 running 任务写入

## 非阻塞待办

- Windows 交互 shell 手工验证
- TaskStop 对 shell 任务 kill（仍仅 subagent）
- 矩阵文档更新为「已实现」（可选后续 PR）

## 结论

**通过** — 可合并交付。
