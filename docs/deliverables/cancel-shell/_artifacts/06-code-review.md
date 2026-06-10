# 代码审查：取消 Shell

**审查范围：** 步骤 5 全部代码变更，对照 `proposal-cancel-shell.md` 与 `plan-cancel-shell.md`

## 功能

- [x] TaskStop 可停止后台 shell task_id
- [x] stopAgentTurn 终止同 session running shell
- [x] 已结束任务幂等
- [x] TaskOutput 可读 stopped 状态（formatShellTaskOutput 已有 Status 行）

## 质量

- [x] 复用既有 `procById`，与 ShellStdin 共享进程表，无重复 spawn 逻辑
- [x] close 回调不覆盖 `stopped` 状态
- [x] timeout 回调跳过已 stopped 任务
- [x] 单测覆盖核心路径

## 安全

- [x] 仅 kill 本进程 Map 内注册的后台 shell，无任意 pid 参数
- [x] sessionId 过滤 stopAgentTurn 范围

## 阻塞项

无。

## 非阻塞待办

- 前台同步 Bash 在用户 Stop 时仍可能跑到 timeout（已知限制）
- Chat UI「取消命令」按钮未做

## 审查结论

**通过**
