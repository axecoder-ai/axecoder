# 代码审查 — agent-tool-level-prompts

## 结论

**通过**（无阻塞项）

## 功能

- [x] 全部 `AGENT_TOOLS` 使用长 description
- [x] `SUB_AGENT_TOOLS` 派生逻辑未变
- [x] 描述与 executor 行为一致（Read-before-Edit、路径相对根、Bash 超时等）

## 质量

- [x] 模块化与 `agent-output-styles.ts` 一致
- [x] 单测覆盖 strict 长度与关键短语
- [x] 模板字符串内反引号已转义

## 安全

- [x] Bash 描述含 git 安全与禁止破坏性命令要点
- [x] 未放宽路径沙箱

## 非阻塞待办

- 未来新增工具时同步 `agent-tool-prompts.ts`
- 若获得 同类 Agent `prompt.ts` 快照，可 diff 微调措辞
