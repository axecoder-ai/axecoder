# 代码审查 — agent-bash-parity

## 结论

**通过**（无阻塞项；有非阻塞待办）

## 功能

- [x] CC 参数 `timeout` / `description` / `run_in_background` 已注册并贯通 executor
- [x] 后台任务与 `TaskOutput` 集成
- [x] 危险 git 拦截在后台路径复用 `isDangerousGitCommand`
- [x] 批准流与既有 `bash_pending` 一致

## 质量

- [x] 新增 `UT-agent-bash-parity` 覆盖主路径
- [x] 改动面集中在 agent 层，符合最小 diff

## 安全

- [x] 无新增命令注入面（仍为用户批准后的 projectRoot spawn）
- [x] 输出截断复用 `trimBashOutput`

## 非阻塞待办

1. 持久 shell + 15s 自动后台（提案 1 范围）
2. `TaskStop` 对 shell 任务的支持（当前仅子代理）
3. Windows 平台后台 echo 手测
4. 全仓 13 个历史单测失败宜单独清理

## 优先级

| 项 | 优先级 |
|----|--------|
| TaskStop shell | P2 |
| 持久会话 | P1（若用户要求完整 1:1） |
| Windows 验证 | P2 |
