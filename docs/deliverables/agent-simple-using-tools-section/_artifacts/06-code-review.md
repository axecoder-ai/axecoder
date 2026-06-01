# 代码审查

## 结论

**通过**

## 要点

- §7 主段与 §15 顺序正确；Bash 工具与 §7 文案一致。
- `runAgentBash` 限定 cwd 为 projectRoot；超时与输出截断降低挂死风险。

## 非阻塞待办

- Bash 危险命令的用户确认 UI（类似写盘 pending）未做，依赖 §6 提示与模型自律。
- §8 session guidance 后续项。
